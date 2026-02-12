# How to Set Up a MEAN Stack on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, MEAN, Node.js, MongoDB

Description: Step-by-step guide to setting up a MEAN stack (MongoDB, Express.js, Angular, Node.js) on an EC2 instance for building modern full-stack JavaScript applications.

---

The MEAN stack - MongoDB, Express.js, Angular, and Node.js - lets you build full-stack web applications entirely in JavaScript. From the database query layer to the frontend UI, it's JavaScript all the way through. Setting it up on EC2 gives you a clean, controlled environment where you can configure every component exactly the way you need it.

Let's go through each component, installing and configuring them on a fresh EC2 instance.

## Choosing the Right Instance

MEAN applications are typically more memory-hungry than traditional LAMP stacks because Node.js, MongoDB, and Angular builds all consume significant RAM.

For development, a t3.medium (2 vCPU, 4 GB RAM) works. For production with MongoDB on the same instance, you'll want at least a t3.large (2 vCPU, 8 GB RAM) or ideally separate the database to its own instance.

Launch your instance:

```bash
# Launch a t3.large for MEAN stack
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.large \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123 \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mean-server}]'
```

## Installing Node.js

We'll use nvm (Node Version Manager) to install Node.js, which makes it easy to switch between versions.

Install Node.js with nvm:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm into current session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install the latest LTS version of Node.js
nvm install --lts

# Verify installation
node --version
npm --version
```

Install some globally useful tools:

```bash
# Install PM2 for process management and Angular CLI
npm install -g pm2 @angular/cli
```

## Installing MongoDB

MongoDB is the "M" in MEAN. We'll install the Community Edition directly on the instance.

Add the MongoDB repository and install:

```bash
# Create the MongoDB repo file
sudo cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF

# Install MongoDB
sudo yum install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
mongosh --eval "db.runCommand({ping: 1})"
```

## Securing MongoDB

MongoDB runs without authentication by default. That's dangerous even in development.

Enable authentication and create an admin user:

```bash
# Connect to MongoDB and create admin user
mongosh << 'EOF'
use admin
db.createUser({
  user: "admin",
  pwd: "strong_admin_password",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

// Create application database and user
use myapp
db.createUser({
  user: "myapp_user",
  pwd: "strong_app_password",
  roles: [{ role: "readWrite", db: "myapp" }]
})
EOF
```

Enable authentication in the MongoDB config:

```bash
# Edit MongoDB configuration
sudo cat > /etc/mongod.conf << 'EOF'
# mongod.conf

storage:
  dbPath: /var/lib/mongo

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF

# Restart MongoDB with authentication enabled
sudo systemctl restart mongod

# Test authenticated connection
mongosh -u myapp_user -p strong_app_password --authenticationDatabase myapp
```

## Building the Express.js Backend

Now let's set up the Express.js application that connects to MongoDB.

Create the project structure:

```bash
# Create project directory
mkdir -p /home/ec2-user/myapp/backend
cd /home/ec2-user/myapp/backend

# Initialize the Node.js project
npm init -y

# Install Express and essential dependencies
npm install express mongoose cors dotenv helmet morgan
npm install --save-dev nodemon
```

Create the main server file:

```javascript
// /home/ec2-user/myapp/backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://myapp_user:strong_app_password@localhost:27017/myapp';

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple model example
const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', ItemSchema);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Create an environment file:

```bash
# Create .env file
cat > /home/ec2-user/myapp/backend/.env << 'EOF'
PORT=3000
MONGODB_URI=mongodb://myapp_user:strong_app_password@localhost:27017/myapp
NODE_ENV=production
EOF
```

## Setting Up Angular Frontend

Create the Angular application that will consume the Express API.

Scaffold and build the Angular app:

```bash
# Navigate to the project root
cd /home/ec2-user/myapp

# Create a new Angular project
ng new frontend --routing --style=css --skip-git

cd frontend

# Build the production version
ng build --configuration production
```

The built files will be in `/home/ec2-user/myapp/frontend/dist/frontend/browser/`. You can serve these from Express or through nginx as a reverse proxy.

To serve the Angular app from Express, add static file serving to your backend:

```javascript
// Add to server.js - serve Angular static files
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend/browser')));

// Catch-all route for Angular routing (add after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/frontend/browser/index.html'));
});
```

## Running with PM2

PM2 is the standard process manager for Node.js in production. It handles restarts, logging, and clustering.

Set up PM2 to manage your application:

```bash
# Start the application with PM2
cd /home/ec2-user/myapp/backend
pm2 start server.js --name myapp

# Configure PM2 to start on boot
pm2 startup
pm2 save

# View application status
pm2 status

# View logs
pm2 logs myapp

# Enable cluster mode for better performance (uses all CPU cores)
pm2 start server.js --name myapp -i max
```

Create a PM2 ecosystem file for more control:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    script: 'server.js',
    cwd: '/home/ec2-user/myapp/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/ec2-user/myapp/logs/error.log',
    out_file: '/home/ec2-user/myapp/logs/output.log'
  }]
};
```

## Setting Up Nginx as Reverse Proxy

Nginx in front of Node.js handles SSL, static files, and connection management much better than Node alone.

Install and configure nginx:

```bash
# Install nginx
sudo yum install -y nginx

# Create the nginx configuration
sudo cat > /etc/nginx/conf.d/myapp.conf << 'EOF'
server {
    listen 80;
    server_name myapp.example.com;

    # Serve Angular static files directly
    location / {
        root /home/ec2-user/myapp/frontend/dist/frontend/browser;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Express
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Test and start nginx
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

## MongoDB Backups

Schedule regular MongoDB backups:

```bash
#!/bin/bash
# /usr/local/bin/backup-mongo.sh
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb://myapp_user:strong_app_password@localhost:27017/myapp" \
  --out=$BACKUP_DIR/backup_$DATE

# Compress the backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

For monitoring your MEAN stack application, including Node.js process health, MongoDB query performance, and Express response times, take a look at our [AWS infrastructure monitoring guide](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

The MEAN stack on EC2 gives you a full JavaScript development and production environment. The key components are: Node.js as the runtime, Express.js as the web framework, MongoDB as the database, and Angular for the frontend. Add PM2 for process management, nginx as a reverse proxy, and proper security configuration, and you've got a solid foundation for building modern web applications.
