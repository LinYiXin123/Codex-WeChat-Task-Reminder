package com.codexui.bridge;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.Locale;

@CapacitorPlugin(name = "MobileShell")
public class MobileShellPlugin extends Plugin {

    private static final int CONNECT_TIMEOUT_MS = 20_000;
    private static final int READ_TIMEOUT_MS = 90_000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void getServerConfig(PluginCall call) {
        String bundledServerUrl = MobileShellConfig.getBundledServerUrl(getContext());
        String resolvedServerUrl = MobileShellConfig.resolveServerUrl(getContext(), bundledServerUrl);
        JSObject result = new JSObject();
        result.put("serverUrl", resolvedServerUrl);
        result.put("defaultServerUrl", bundledServerUrl);
        result.put("usingDefault", MobileShellConfig.isUsingDefaultServerUrl(getContext(), bundledServerUrl));
        call.resolve(result);
    }

    @PluginMethod
    public void setServerUrl(PluginCall call) {
        String serverUrl = MobileShellConfig.normalizeServerUrl(call.getString("serverUrl", ""));
        if (!MobileShellConfig.isValidServerUrl(serverUrl)) {
            call.reject("服务地址格式无效，请使用完整的 http(s)://host:port 地址");
            return;
        }

        MobileShellConfig.getPreferences(getContext())
            .edit()
            .putString(MobileShellConfig.PREF_SERVER_URL, serverUrl)
            .apply();

        String bundledServerUrl = MobileShellConfig.getBundledServerUrl(getContext());
        JSObject result = new JSObject();
        result.put("serverUrl", serverUrl);
        result.put("defaultServerUrl", bundledServerUrl);
        result.put("usingDefault", false);
        result.put("restartScheduled", true);
        call.resolve(result);
        scheduleRestart();
    }

    @PluginMethod
    public void resetServerUrl(PluginCall call) {
        MobileShellConfig.getPreferences(getContext())
            .edit()
            .remove(MobileShellConfig.PREF_SERVER_URL)
            .apply();

        String bundledServerUrl = MobileShellConfig.getBundledServerUrl(getContext());
        String resolvedServerUrl = MobileShellConfig.resolveServerUrl(getContext(), bundledServerUrl);
        JSObject result = new JSObject();
        result.put("serverUrl", resolvedServerUrl);
        result.put("defaultServerUrl", bundledServerUrl);
        result.put("usingDefault", true);
        result.put("restartScheduled", true);
        call.resolve(result);
        scheduleRestart();
    }

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            PackageManager packageManager = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            PackageInfo packageInfo;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageInfo = packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0));
            } else {
                packageInfo = packageManager.getPackageInfo(packageName, 0);
            }

            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? packageInfo.getLongVersionCode()
                : packageInfo.versionCode;
            String appName = String.valueOf(packageManager.getApplicationLabel(getContext().getApplicationInfo()));
            boolean canRequestInstall = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || packageManager.canRequestPackageInstalls();

            JSObject result = new JSObject();
            result.put("appName", appName);
            result.put("packageName", packageName);
            result.put("versionName", packageInfo.versionName == null ? "" : packageInfo.versionName);
            result.put("versionCode", versionCode);
            result.put("canRequestPackageInstalls", canRequestInstall);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException exception) {
            call.reject("读取 App 版本信息失败", exception);
        }
    }

    @PluginMethod
    public void installApkFromUrl(PluginCall call) {
        String downloadUrl = MobileShellConfig.normalizeServerUrl(call.getString("url", ""));
        if (!isValidDownloadUrl(downloadUrl)) {
            call.reject("更新包地址无效，请检查 GitHub 发布配置");
            return;
        }

        String fileName = sanitizeFileName(call.getString("fileName", ""));
        if (fileName.isEmpty()) {
            fileName = "cx-codex-update.apk";
        }
        if (!fileName.toLowerCase(Locale.ROOT).endsWith(".apk")) {
            fileName = fileName + ".apk";
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            openUnknownAppsSettings();
            JSObject result = new JSObject();
            result.put("status", "permission_required");
            result.put("fileName", fileName);
            call.resolve(result);
            return;
        }

        final String resolvedFileName = fileName;
        new Thread(() -> downloadAndInstallApk(call, downloadUrl, resolvedFileName)).start();
    }

    private void downloadAndInstallApk(PluginCall call, String downloadUrl, String fileName) {
        HttpURLConnection connection = null;
        File targetFile = new File(getContext().getCacheDir(), fileName);
        try {
            if (targetFile.exists() && !targetFile.delete()) {
                throw new IOException("无法覆盖旧的更新安装包");
            }

            connection = (HttpURLConnection) new URL(downloadUrl).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
            connection.setRequestProperty("User-Agent", "CX-Codex-Android-Updater");
            connection.setInstanceFollowRedirects(true);
            connection.connect();

            int statusCode = connection.getResponseCode();
            if (statusCode < 200 || statusCode >= 300) {
                throw new IOException("HTTP " + statusCode);
            }

            try (InputStream inputStream = connection.getInputStream();
                 OutputStream outputStream = new FileOutputStream(targetFile)) {
                byte[] buffer = new byte[16 * 1024];
                int readLength;
                while ((readLength = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, readLength);
                }
                outputStream.flush();
            }

            File apkFile = targetFile;
            mainHandler.post(() -> {
                try {
                    openInstallIntent(apkFile);
                    JSObject result = new JSObject();
                    result.put("status", "started");
                    result.put("fileName", fileName);
                    call.resolve(result);
                } catch (Exception exception) {
                    call.reject("拉起安装界面失败：" + exception.getMessage(), exception);
                }
            });
        } catch (Exception exception) {
            Exception resolvedException = exception instanceof Exception ? (Exception) exception : new Exception(exception);
            mainHandler.post(() -> call.reject("下载更新失败：" + resolvedException.getMessage(), resolvedException));
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void openInstallIntent(File apkFile) {
        Uri apkUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );

        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(installIntent);
    }

    private void openUnknownAppsSettings() {
        Intent settingsIntent = new Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:" + getContext().getPackageName())
        );
        settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(settingsIntent);
    }

    private void scheduleRestart() {
        mainHandler.postDelayed(() -> {
            if (getActivity() == null) {
                return;
            }
            Intent restartIntent = new Intent(getActivity(), MainActivity.class);
            restartIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            getActivity().startActivity(restartIntent);
            getActivity().finish();
        }, 180);
    }

    private static boolean isValidDownloadUrl(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            return false;
        }
        try {
            URI uri = new URI(normalized);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null) {
                return false;
            }
            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            return normalizedScheme.equals("http") || normalizedScheme.equals("https");
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private static String sanitizeFileName(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            return "";
        }
        return normalized.replaceAll("[\\\\/:*?\"<>|]", "-");
    }
}
