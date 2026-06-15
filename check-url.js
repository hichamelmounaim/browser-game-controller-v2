const http = require('http');

http.get('http://localhost:3000/fr/game/rowdy-wrestling', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', () => {});
  res.on('end', () => console.log('Done'));
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
