const { setSetting, exportToMainSite } = require('./src/lib/db');

(async () => {
  try {
    setSetting('site_name', 'Gamecis');
    setSetting('site_logo', '/logo.jpg');
    console.log('Settings updated in DB');
    await exportToMainSite();
    console.log('Export complete');
  } catch (err) {
    console.error('Error:', err);
  }
})();
