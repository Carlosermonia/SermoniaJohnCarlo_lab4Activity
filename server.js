const express = require('express');
const bycrypt = require('bcryptjs'); 
const jwt  = require  ('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT =  3000;
const SECRET_KEY = 'your-very-secure-secret';
app.use (express.json());

app.use(cors({
     origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
}));


let users = [
    {id: 1, username: 'admin@example.com', password: '$2a$10$...', role: 'admin'},
    {id: 2, username: 'alice', password: '$2a$10$...', role: 'user'}
];


if (users[0].password === '$2a$10$...') {
    users[0].password = bycrypt.hashSync('Password123!', 10);
    users[1].password = bycrypt.hashSync('user123', 10);
}



app.post('/api/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;
   
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' }); 
  }

  const hashedPassword = await bycrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    password: hashedPassword,       
    role
  };

  users.push(newUser); 
  res.status(201).json({ message: 'User registered', username, role });
});

app.post('/api/login', async (req, res) => {
    const {username, password} = req.body;

    const user = users.find(u => u.username === username);
    if (!user || !await bycrypt.compare(password, user.password)){
        return res.status(400).json({error: 'Invalid credentials'});
    }

    const token = jwt.sign({id: user.id, username: user.username, role: user.role}, SECRET_KEY, {expiresIn: '1h'});
    res.json({token ,user: {username: user.username, role: user.role}});
});

app.get('/api/profile', authenticateToken , (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/admin/dashboard', authenticateToken, authorizedRole('admin'), (req, res) => {
    res.json({ message: 'Welcome to the admin dashboard', data:'Secret admin info'});
});

app.get('/api/content/guest',   (req, res) => {
    res.json({ message: 'Welcome guest! This content is public.'});
});

function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({error: 'access token required'});
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({error: 'invalid or expire token'});
        req.user = user;
        next();
    });
}

function authorizedRole(role){
    return (req, res, next) => {
        if (req.user.role !== role){
            return res.status(403).json({error: 'Access denied: insufficient permissions'});
        }
        next();
    };
}
let employees = [];

app.get('/api/admin/employees', authenticateToken, authorizedRole('admin'), (req, res) => {
    res.json(employees);
});

app.post('/api/admin/employees', authenticateToken, authorizedRole('admin'), (req, res) => {
    const { name, position, dept, hireDate } = req.body;
    if (!name || !position || !dept || !hireDate) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const newEmp = {
        id: 'EMP-' + (employees.length + 101),
        name, position, dept, hireDate
    };
    employees.push(newEmp);
    res.status(201).json(newEmp);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`try logging in with :`);
    console.log(` -Admin: username: admin@example.com, password: Password123!`);
    console.log(` -User: username: alice, password: user123`);      
});