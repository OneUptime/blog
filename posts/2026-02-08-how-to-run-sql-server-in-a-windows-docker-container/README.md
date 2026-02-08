# How to Run SQL Server in a Windows Docker Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, SQL Server, windows containers, database, Microsoft, containerization, DevOps

Description: Run Microsoft SQL Server in Docker containers for development, testing, and CI/CD with persistent data and automated setup scripts.

---

SQL Server is the database engine behind countless enterprise applications. Running it in a Docker container gives developers instant access to a disposable database instance for testing, eliminates "works on my machine" problems, and lets CI/CD pipelines spin up fresh databases for every test run. Microsoft officially supports SQL Server in both Linux and Windows containers, so you can match your production environment exactly.

This guide covers running SQL Server in Docker, configuring it for development and testing workflows, managing data persistence, and automating database initialization.

## Choosing Between Linux and Windows Containers

SQL Server runs on both Linux and Windows containers. The Linux variant is lighter, starts faster, and works on any platform that runs Docker. The Windows container is larger but matches a traditional Windows Server SQL deployment.

```powershell
# Linux-based SQL Server (recommended for most use cases)
docker pull mcr.microsoft.com/mssql/server:2022-latest

# Windows-based SQL Server (for Windows-only environments)
docker pull mcr.microsoft.com/mssql/server:2022-CU12-windowsservercore-ltsc2022
```

For this guide, we will cover both options but focus on practical workflows that apply to either.

## Running SQL Server Quickly

The fastest way to get a SQL Server instance running.

```bash
# Start SQL Server with Linux container
docker run -d \
  --name sqlserver \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -e "MSSQL_PID=Developer" \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

```powershell
# Start SQL Server with Windows container
docker run -d `
  --name sqlserver-win `
  -e "ACCEPT_EULA=Y" `
  -e "SA_PASSWORD=YourStrong!Passw0rd" `
  -p 1433:1433 `
  mcr.microsoft.com/mssql/server:2022-CU12-windowsservercore-ltsc2022
```

The password must meet SQL Server complexity requirements: at least 8 characters, with uppercase, lowercase, digits, and special characters.

## Connecting to the Database

Wait a few seconds for SQL Server to start, then connect using any SQL client.

```bash
# Connect using sqlcmd from the container itself
docker exec -it sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -C

# Or install sqlcmd locally and connect to the mapped port
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd"
```

Run a quick test query to verify everything works.

```sql
-- Check the SQL Server version
SELECT @@VERSION;
GO

-- List all databases
SELECT name FROM sys.databases;
GO

-- Create a test database
CREATE DATABASE TestDB;
GO
```

## Persistent Data with Volumes

Without a volume, your database disappears when the container stops. Always mount a volume for data you want to keep.

```bash
# Create a named volume for SQL Server data
docker volume create sqlserver-data

# Run SQL Server with persistent storage
docker run -d \
  --name sqlserver \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -e "MSSQL_PID=Developer" \
  -p 1433:1433 \
  -v sqlserver-data:/var/opt/mssql \
  mcr.microsoft.com/mssql/server:2022-latest
```

Now your databases survive container restarts and even container removal, as long as you keep the volume.

```bash
# Stop and remove the container
docker stop sqlserver && docker rm sqlserver

# Start a new container with the same volume - data is still there
docker run -d \
  --name sqlserver \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -e "MSSQL_PID=Developer" \
  -p 1433:1433 \
  -v sqlserver-data:/var/opt/mssql \
  mcr.microsoft.com/mssql/server:2022-latest
```

## Automated Database Initialization

For development and CI/CD, you often need a database with schema and seed data ready to go. Create a custom image that initializes the database on first run.

```dockerfile
# Dockerfile - SQL Server with automatic database setup
FROM mcr.microsoft.com/mssql/server:2022-latest

# Switch to root for file operations
USER root

# Create a directory for initialization scripts
RUN mkdir -p /docker-entrypoint-initdb

# Copy SQL initialization scripts
COPY ./init-scripts/ /docker-entrypoint-initdb/

# Copy the entrypoint wrapper script
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Switch back to the mssql user
USER mssql

# Environment variables with defaults
ENV ACCEPT_EULA=Y
ENV MSSQL_PID=Developer

ENTRYPOINT ["/entrypoint.sh"]
```

Create the entrypoint script that runs SQL Server and then executes initialization scripts.

```bash
#!/bin/bash
# entrypoint.sh - Start SQL Server and run init scripts

# Start SQL Server in the background
/opt/mssql/bin/sqlservr &
SQLSERVER_PID=$!

# Wait for SQL Server to become available
echo "Waiting for SQL Server to start..."
for i in {1..60}; do
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "SQL Server is ready."
        break
    fi
    sleep 1
done

# Run initialization scripts in order
for script in /docker-entrypoint-initdb/*.sql; do
    if [ -f "$script" ]; then
        echo "Running $script..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -i "$script"
    fi
done

echo "Initialization complete."

# Keep the container running by waiting on the SQL Server process
wait $SQLSERVER_PID
```

Create your initialization scripts.

```sql
-- init-scripts/01-create-database.sql
-- Create the application database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AppDB')
BEGIN
    CREATE DATABASE AppDB;
END
GO

USE AppDB;
GO

-- Create tables
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

CREATE TABLE Orders (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT FOREIGN KEY REFERENCES Users(Id),
    Amount DECIMAL(10,2) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'pending',
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO
```

```sql
-- init-scripts/02-seed-data.sql
-- Insert test data
USE AppDB;
GO

INSERT INTO Users (Username, Email) VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com'),
    ('charlie', 'charlie@example.com');
GO

INSERT INTO Orders (UserId, Amount, Status) VALUES
    (1, 99.99, 'completed'),
    (1, 149.50, 'pending'),
    (2, 75.00, 'completed'),
    (3, 200.00, 'shipped');
GO
```

Build and run the initialized database.

```bash
# Build the custom image
docker build -t myapp-sqlserver .

# Run it - database is ready with schema and test data
docker run -d \
  --name myapp-db \
  -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -p 1433:1433 \
  myapp-sqlserver
```

## Docker Compose with Application Stack

Run SQL Server alongside your application.

```yaml
# docker-compose.yml - Application with SQL Server
version: "3.8"

services:
  app:
    build: ./app
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=sqlserver
      - DB_PORT=1433
      - DB_USER=sa
      - DB_PASSWORD=YourStrong!Passw0rd
      - DB_NAME=AppDB
    depends_on:
      sqlserver:
        condition: service_healthy
    networks:
      - app-net

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
      MSSQL_PID: Developer
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - app-net
    healthcheck:
      # Check if SQL Server is accepting connections
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

volumes:
  sqlserver_data:

networks:
  app-net:
```

## Backup and Restore

```bash
# Create a database backup inside the container
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -C \
  -Q "BACKUP DATABASE AppDB TO DISK='/var/opt/mssql/backup/AppDB.bak' WITH INIT"

# Copy the backup file to the host
docker cp sqlserver:/var/opt/mssql/backup/AppDB.bak ./AppDB.bak

# Restore a backup into the container
docker cp ./AppDB.bak sqlserver:/var/opt/mssql/backup/AppDB.bak

docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -C \
  -Q "RESTORE DATABASE AppDB FROM DISK='/var/opt/mssql/backup/AppDB.bak' WITH REPLACE"
```

## Performance Tuning

```bash
# Allocate specific memory limits to the SQL Server container
docker run -d \
  --name sqlserver \
  --memory 4g \
  --cpus 2 \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -e "MSSQL_PID=Developer" \
  -e "MSSQL_MEMORY_LIMIT_MB=3072" \
  -p 1433:1433 \
  -v sqlserver-data:/var/opt/mssql \
  mcr.microsoft.com/mssql/server:2022-latest
```

## Using SQL Server in CI/CD

```yaml
# GitHub Actions example - test with SQL Server
name: Database Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      sqlserver:
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
          ACCEPT_EULA: Y
          MSSQL_SA_PASSWORD: YourStrong!Passw0rd
        ports:
          - 1433:1433
        options: >-
          --health-cmd "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P YourStrong!Passw0rd -C -Q 'SELECT 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - name: Run database migrations
        run: dotnet ef database update
        env:
          ConnectionStrings__DefaultConnection: "Server=localhost;Database=TestDB;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"
      - name: Run tests
        run: dotnet test
```

## Conclusion

SQL Server in Docker transforms database management for development and testing. Developers get isolated, disposable database instances that start in seconds. CI/CD pipelines get fresh databases for every test run. The custom initialization pattern ensures every instance starts with the exact schema and data you need. Whether you choose Linux or Windows containers, the workflow is the same: pull, configure, run, and connect. Pair it with volume mounts for persistence, health checks for orchestration, and automated backups for peace of mind.
