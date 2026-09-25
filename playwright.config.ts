import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true } },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
    serviceWorkers: 'block',
  },
  webServer: { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
});
