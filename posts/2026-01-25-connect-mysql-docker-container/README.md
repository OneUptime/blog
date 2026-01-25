# How to Connect to MySQL from Docker Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, MySQL, Database, Networking, DevOps

Description: Learn multiple methods to connect to MySQL from Docker containers, including Docker networks, host networking, and Docker Compose configurations with practical connection string examples.

---

Connecting your application container to a MySQL database is one of the most common Docker networking tasks. Whether MySQL runs in another container, on the host machine, or on a remote server, understanding Docker networking fundamentals helps you establish reliable connections.

## Method 1: Docker Network (Container to Container)

When both your application and MySQL run as containers, create a user-defined network for them to communicate.

First, create a dedicated network:

```bash
# Create a bridge network for your application stack
docker network create app-network
```

Start MySQL with a name on this network:

```bash
# Run MySQL container on the app-network
docker run -d \
  --name mysql-db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppassword \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0
```

Now your application container can connect using the container name as hostname:

```bash
# Run your application container on the same network
docker run -d \
  --name my-app \
  --network app-network \
  -e DATABASE_URL="mysql://appuser:apppassword@mysql-db:3306/myapp" \
  my-app-image:latest
```

The key insight here is that Docker's embedded DNS resolves container names to their IP addresses within the network.

### Testing the Connection

Verify connectivity from your application container:

```bash
# Shell into your app container
docker exec -it my-app sh

# Test DNS resolution
nslookup mysql-db

# Test MySQL connection (if mysql client is available)
mysql -h mysql-db -u appuser -papppassword myapp -e "SELECT 1"
```

## Method 2: Docker Compose

Docker Compose simplifies multi-container setups by automatically creating networks:

```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql-db
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    volumes:
      - mysql-data:/var/lib/mysql
      # Optional: mount initialization scripts
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      # Expose to host for debugging (optional)
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: my-app
    environment:
      # Use service name 'mysql' as hostname
      DATABASE_HOST: mysql
      DATABASE_PORT: 3306
      DATABASE_NAME: myapp
      DATABASE_USER: appuser
      DATABASE_PASSWORD: apppassword
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql-data:
```

Start both services:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f mysql

# Check service status
docker compose ps
```

## Method 3: Connecting to MySQL on Host Machine

When MySQL runs directly on your host (not in a container), use special DNS names to reach it.

### On Docker Desktop (Mac/Windows)

```bash
# Use host.docker.internal to reach the host
docker run -it --rm mysql:8.0 \
  mysql -h host.docker.internal -u appuser -papppassword myapp
```

### On Linux

Linux requires either host networking or adding the host gateway:

```bash
# Option A: Use host network mode
docker run -it --rm --network host mysql:8.0 \
  mysql -h 127.0.0.1 -u appuser -papppassword myapp

# Option B: Add host gateway (Docker 20.10+)
docker run -it --rm \
  --add-host=host.docker.internal:host-gateway \
  mysql:8.0 \
  mysql -h host.docker.internal -u appuser -papppassword myapp
```

### MySQL Configuration for Host Connections

If MySQL on the host only listens on localhost, update its configuration:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
bind-address = 0.0.0.0
```

Then grant access to Docker's network range:

```sql
-- Grant access from Docker bridge network
CREATE USER 'appuser'@'172.17.%' IDENTIFIED BY 'apppassword';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'172.17.%';
FLUSH PRIVILEGES;
```

## Connection Strings for Different Languages

Here are working connection strings for common frameworks:

### Node.js (mysql2)

```javascript
// Using environment variables
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'mysql-db',
  port: process.env.DATABASE_PORT || 3306,
  user: process.env.DATABASE_USER || 'appuser',
  password: process.env.DATABASE_PASSWORD || 'apppassword',
  database: process.env.DATABASE_NAME || 'myapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

### Python (SQLAlchemy)

```python
import os
from sqlalchemy import create_engine

# Build connection URL from environment
db_url = (
    f"mysql+pymysql://"
    f"{os.getenv('DATABASE_USER', 'appuser')}:"
    f"{os.getenv('DATABASE_PASSWORD', 'apppassword')}@"
    f"{os.getenv('DATABASE_HOST', 'mysql-db')}:"
    f"{os.getenv('DATABASE_PORT', '3306')}/"
    f"{os.getenv('DATABASE_NAME', 'myapp')}"
)

engine = create_engine(db_url, pool_size=10, pool_recycle=3600)
```

### Go

```go
package main

import (
    "database/sql"
    "fmt"
    "os"
    _ "github.com/go-sql-driver/mysql"
)

func main() {
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
        getEnv("DATABASE_USER", "appuser"),
        getEnv("DATABASE_PASSWORD", "apppassword"),
        getEnv("DATABASE_HOST", "mysql-db"),
        getEnv("DATABASE_PORT", "3306"),
        getEnv("DATABASE_NAME", "myapp"),
    )

    db, err := sql.Open("mysql", dsn)
    if err != nil {
        panic(err)
    }
    defer db.Close()
}

func getEnv(key, fallback string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return fallback
}
```

## Handling Connection Timing

MySQL takes time to initialize. Your application should retry connections:

```yaml
# docker-compose.yml with healthcheck
services:
  mysql:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$$MYSQL_ROOT_PASSWORD"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s

  app:
    depends_on:
      mysql:
        condition: service_healthy
```

Or implement retry logic in your application:

```python
import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

def get_db_connection(max_retries=30, delay=2):
    """Retry database connection with exponential backoff."""
    engine = create_engine(db_url)

    for attempt in range(max_retries):
        try:
            conn = engine.connect()
            print(f"Connected to database on attempt {attempt + 1}")
            return conn
        except OperationalError as e:
            if attempt < max_retries - 1:
                print(f"Connection attempt {attempt + 1} failed, retrying in {delay}s...")
                time.sleep(delay)
                delay = min(delay * 1.5, 30)  # Cap at 30 seconds
            else:
                raise e
```

## Troubleshooting Common Issues

### Error: Connection Refused

```bash
# Check if MySQL container is running
docker ps | grep mysql

# Check MySQL logs for startup errors
docker logs mysql-db

# Verify the container is listening on the expected port
docker exec mysql-db netstat -tlnp
```

### Error: Access Denied

```bash
# Connect as root to verify user exists
docker exec -it mysql-db mysql -u root -prootpassword

# Check user privileges
SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'appuser'@'%';
```

### Error: Unknown Host

```bash
# Verify both containers are on the same network
docker network inspect app-network

# Check DNS resolution from app container
docker exec my-app nslookup mysql-db
```

---

Connecting to MySQL from Docker containers becomes straightforward once you understand Docker networking. Use user-defined networks for container-to-container communication, leverage Docker Compose for complex setups, and always implement proper connection retry logic. These patterns apply to other databases like PostgreSQL or MariaDB with minimal changes.
