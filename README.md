# Ganakam

A cross-platform CTC (Cost To Company) calculator for Indian financials. Handles salary breakdowns, statutory deductions (PF, ESI, PT, Gratuity), bulk employee processing, and PDF annexure generation for appointment letters.

Built with Electron + React + TypeScript. Runs on Windows and macOS.

---

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
```bash
git clone https://github.com/pingalit/ganakam.git
cd ganakam
npm install
```

### Run in dev mode
```bash
npm run dev
```

### Run tests
```bash
npm test
```

---

## Building

### Local builds (no publishing)
```bash
npm run dist:win   # → dist/Ganakam-x.x.x-setup.exe  (run on Windows)
npm run dist:mac   # → dist/Ganakam-x.x.x.dmg         (run on macOS)
```

> Windows builds must be run on Windows. macOS builds must be run on macOS.

---

## CI / CD

Two GitHub Actions workflows handle automated testing and releases.

### Workflows

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | Every push / PR to `main` | Installs deps, runs unit tests |
| `.github/workflows/release.yml` | Push of a `v*` tag | Builds Win + Mac installers, publishes GitHub Release |

### Releasing a new version

**Step 1 — Bump the version**

Edit `package.json`:
```json
{ "version": "1.1.0" }
```

**Step 2 — Commit and push**
```bash
git add package.json
git commit -m "release v1.1.0"
git push origin main
```

**Step 3 — Tag the release**
```bash
git tag v1.1.0
git push origin v1.1.0
```

This triggers the release workflow. Two runners start in parallel:

- **`windows-latest`** → builds `Ganakam-1.1.0-setup.exe` + `latest.yml`
- **`macos-latest`** → builds `Ganakam-1.1.0.dmg` + `Ganakam-1.1.0-mac.zip` + `latest-mac.yml`

All files are attached to a GitHub Release tagged `v1.1.0`.

### OTA updates

Installed users receive updates automatically. On app launch, `electron-updater` checks GitHub Releases for a newer version. If found, it downloads silently in the background and shows a "Restart & Install" banner when ready.

- First install on macOS shows a Gatekeeper warning (right-click → Open). Subsequent OTA updates are seamless with no warnings.
- Windows updates are fully silent via the NSIS installer.

### Required GitHub settings

Go to **Settings → Actions → General → Workflow permissions** and select **"Read and write permissions"**. No secrets need to be added — `GITHUB_TOKEN` is provided automatically by GitHub Actions with sufficient permissions to create releases and upload build artifacts.

> **You do NOT need a Personal Access Token (PAT)** for builds or releases. A PAT would only be needed if you were publishing to a *different* repository or a private registry.

---

## Project structure

```
src/
├── main/                   Electron main process
│   └── ipc/                IPC handlers (store, file dialogs)
├── preload/                Context bridge (secure IPC surface)
└── renderer/src/
    ├── core/               Calculation engine + types (no UI deps)
    ├── components/         Reusable UI components
    ├── pages/              Route-level pages
    ├── pdf/                Appointment letter annexure (react-pdf)
    ├── store/              Zustand stores (settings, calculator, bulk)
    └── lib/                Utilities (INR formatting, CSV parsing)
```

## Settings

All statutory values are configurable in-app under **Settings**:

- **Fiscal Years** — ESI/PF thresholds, PT slab, Medical, BYOD, Gratuity rate per FY. New FYs can be added and set active without any code changes.
- **Tiers** — Basic/HRA/CCA percentages. Custom tiers can be added.
- **Salary Components** — Add custom allowances, deductions, or employer contributions with optional threshold conditions.

