const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '4fd5ba92-9561-4db0-84dd-6ecc037348d4', role: 'creator' }, 'quick_secret_jwt_2026', { expiresIn: '1h' });
console.log(token);
