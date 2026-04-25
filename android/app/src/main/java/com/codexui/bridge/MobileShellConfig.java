package com.codexui.bridge;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.CapConfig;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

public final class MobileShellConfig {

    public static final String PREFS_NAME = "CodexUiMobileShell";
    public static final String PREF_SERVER_URL = "serverUrl";

    private MobileShellConfig() {}

    public static String getBundledServerUrl(Context context) {
        return normalizeServerUrl(CapConfig.loadDefault(context).getServerUrl());
    }

    public static SharedPreferences getPreferences(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE);
    }

    public static String getStoredServerUrl(Context context) {
        return normalizeServerUrl(getPreferences(context).getString(PREF_SERVER_URL, ""));
    }

    public static String resolveServerUrl(Context context, String configServerUrl) {
        String storedUrl = getStoredServerUrl(context);
        if (!storedUrl.isEmpty()) {
            return storedUrl;
        }

        String normalizedConfigUrl = normalizeServerUrl(configServerUrl);
        if (!normalizedConfigUrl.isEmpty()) {
            return normalizedConfigUrl;
        }

        return getBundledServerUrl(context);
    }

    public static boolean isUsingDefaultServerUrl(Context context, String configServerUrl) {
        String storedUrl = getStoredServerUrl(context);
        if (!storedUrl.isEmpty()) {
            return false;
        }
        String resolved = resolveServerUrl(context, configServerUrl);
        return resolved.equals(getBundledServerUrl(context));
    }

    public static String normalizeServerUrl(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    public static boolean isValidServerUrl(String value) {
        String normalized = normalizeServerUrl(value);
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
            if (!normalizedScheme.equals("http") && !normalizedScheme.equals("https")) {
                return false;
            }
            return uri.getPort() != -1;
        } catch (URISyntaxException exception) {
            return false;
        }
    }
}
