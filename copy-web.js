const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'history.html',
  'analytics.html',
  'profile.html',
  'monthly-reports.html',
  'styles.css',
  'app.js',
  'auth.js',
  'service-worker.js',
  'manifest.json',
  'logo-light.png',
  'logo-dark.png',
  'logo.png',
  'logo.svg'
];

filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

console.log('Successfully synced web assets to www/');
