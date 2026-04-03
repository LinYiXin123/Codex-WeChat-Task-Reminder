# Release Guide

This fork publishes GitHub-first releases for Windows-friendly self-hosting.

## Naming

Use tags like:

- `v0.1.58-bridge.1`
- `v0.1.58-bridge.2`

That keeps fork releases easy to distinguish from upstream npm versions.

## Local Checklist

1. Make sure `main` contains the final README and install flow updates.
2. Run:

   ```powershell
   npm ci
   npm run build
   powershell -ExecutionPolicy Bypass -File .\scripts\package-release.ps1 -Version v0.1.58-bridge.1
   ```

3. Verify the generated files inside `artifacts/`:
   - `codexui-server-bridge-<version>.zip`
   - `codexui-server-bridge-<version>.sha256`
4. Smoke-test the one-command installer or `.\setup.ps1`.

## Publish

Push a tag:

```powershell
git tag v0.1.58-bridge.1
git push publish v0.1.58-bridge.1
```

The `Release` workflow will:

1. install dependencies
2. build the project
3. package a release zip
4. publish a GitHub Release with generated notes

## What Goes Into The Release Bundle

The release zip includes:

- built frontend and CLI artifacts
- Windows bootstrap and install scripts
- source files for local rebuilds
- README, docs, and example config

This keeps the release bundle useful for both beginners and maintainers.
