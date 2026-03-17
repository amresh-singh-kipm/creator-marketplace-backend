const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '387ced52-1d46-11f1-8058-5d7846f3f3e5', role: 'admin' }, 'quick_secret_jwt_2026', { expiresIn: '1h' });
console.log(token);
