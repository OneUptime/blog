# How to Use Docker Compose shm_size Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Shared Memory, Performance, PostgreSQL, Chrome, DevOps

Description: Configure Docker Compose shm_size to allocate proper shared memory for databases, browsers, and memory-mapped applications.

---

If you have ever seen a container crash with a "No space left on device" error while there was plenty of disk space available, the problem was probably shared memory. Docker containers get a tiny 64MB `/dev/shm` partition by default. That is not enough for many real-world applications. The `shm_size` option in Docker Compose lets you increase this allocation.

## What Is Shared Memory?

Shared memory (`/dev/shm`) is a tmpfs filesystem mounted inside every Linux container. It provides a fast, RAM-backed storage area that processes can use to share data with each other. Unlike regular files on disk, shared memory lives in RAM, making reads and writes extremely fast.

Several types of applications depend heavily on shared memory:

- **Databases** like PostgreSQL use shared memory for shared buffers and inter-process communication
- **Headless browsers** like Chrome and Chromium need shared memory for rendering
- **Scientific computing** applications use shared memory for large datasets
- **Machine learning** frameworks use it for data loading pipelines
- **Message queues** and IPC-heavy applications communicate through shared memory segments

## The Default Limit Problem

Docker sets `/dev/shm` to 64MB by default. You can verify this inside any container.

```bash
# Check the default shared memory size
docker run --rm alpine df -h /dev/shm
# Output: Filesystem      Size    Used    Available   Use%  Mounted on
#         shm             64.0M   0       64.0M       0%    /dev/shm
```

For a simple web application, 64MB is fine. But try running PostgreSQL with large shared buffers or Chrome for web scraping, and you will hit the limit fast.

## Setting shm_size in Docker Compose

The syntax is straightforward. Specify the size as a string with a unit suffix.

```yaml
# Set shared memory to 1 gigabyte
version: "3.8"

services:
  my-service:
    image: my-image:latest
    shm_size: "1gb"
```

Supported size units include:
- `b` - bytes
- `k` or `kb` - kilobytes
- `m` or `mb` - megabytes
- `g` or `gb` - gigabytes

```yaml
# Various shm_size examples
services:
  small-shm:
    image: my-app:latest
    shm_size: "128m"

  medium-shm:
    image: my-app:latest
    shm_size: "512m"

  large-shm:
    image: my-app:latest
    shm_size: "2g"
```

## PostgreSQL and Shared Memory

PostgreSQL is the most common reason people need to adjust `shm_size`. PostgreSQL uses shared memory for its shared buffers, WAL buffers, and other internal structures. The PostgreSQL documentation recommends setting `shared_buffers` to about 25% of available RAM. Each shared buffer allocation requires corresponding shared memory.

```yaml
# PostgreSQL with adequate shared memory
version: "3.8"

services:
  postgres:
    image: postgres:16
    shm_size: "256m"
    environment:
      POSTGRES_PASSWORD: secretpass
      POSTGRES_DB: myapp
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "work_mem=16MB"
      - "-c"
      - "effective_cache_size=512MB"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Without sufficient `shm_size`, PostgreSQL will fail to start or crash during heavy operations with errors like:

```
FATAL: could not create shared memory segment: No space left on device
```

A good rule of thumb is to set `shm_size` to at least the value of `shared_buffers`, plus some overhead for WAL buffers and other shared structures.

```yaml
# PostgreSQL production configuration with generous shared memory
services:
  postgres:
    image: postgres:16
    shm_size: "512m"
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=384MB"
      - "-c"
      - "huge_pages=try"
      - "-c"
      - "work_mem=32MB"
    deploy:
      resources:
        limits:
          memory: 2g
```

## Headless Chrome and Browser Automation

Headless Chrome is infamous for shared memory issues. Chrome uses `/dev/shm` for sharing rendering data between its multiple processes. When it runs out, you get crashes, blank pages, or the dreaded "session deleted because of page crash" error in Selenium.

```yaml
# Chrome for web scraping with adequate shared memory
services:
  chrome:
    image: selenium/standalone-chrome:latest
    shm_size: "2g"
    ports:
      - "4444:4444"
    environment:
      SE_NODE_MAX_SESSIONS: 5
```

For Puppeteer-based applications:

```yaml
# Puppeteer application with shared memory allocation
services:
  scraper:
    build: ./scraper
    shm_size: "1g"
    environment:
      PUPPETEER_CHROMIUM_REVISION: latest
    cap_add:
      - SYS_ADMIN
```

An alternative to increasing `shm_size` for Chrome is to disable the use of `/dev/shm` entirely by passing the `--disable-dev-shm-usage` flag. Chrome will then use `/tmp` instead, which is slower but avoids the size limit.

```yaml
# Chrome with /dev/shm usage disabled (slower but no size limit)
services:
  chrome:
    image: selenium/standalone-chrome:latest
    environment:
      JAVA_OPTS: "-Dwebdriver.chrome.args=--disable-dev-shm-usage"
```

However, for performance-sensitive workloads, increasing `shm_size` is the better approach.

## Machine Learning and Data Processing

PyTorch data loaders use shared memory to transfer data between worker processes. With multiple workers and large batches, the default 64MB runs out quickly.

```yaml
# PyTorch training with adequate shared memory for DataLoader workers
services:
  trainer:
    image: pytorch/pytorch:latest
    shm_size: "8g"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    volumes:
      - ./data:/data
      - ./models:/models
    command: python train.py --workers 8 --batch-size 64
```

The required `shm_size` depends on your batch size and the number of data loader workers. A rough formula: `shm_size >= num_workers * batch_size * sample_size_in_bytes * 2`. Start generous and scale down if you want to conserve memory.

## Testing and CI/CD Environments

CI pipelines that run browser tests or database-heavy integration tests frequently hit shared memory limits.

```yaml
# CI/CD test environment with proper shared memory
version: "3.8"

services:
  test-db:
    image: postgres:16
    shm_size: "256m"
    environment:
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  test-browser:
    image: selenium/standalone-chrome:latest
    shm_size: "2g"
    ports:
      - "4444:4444"

  test-runner:
    build: ./tests
    depends_on:
      test-db:
        condition: service_healthy
      test-browser:
        condition: service_started
    environment:
      DATABASE_URL: postgres://postgres:testpass@test-db/testdb
      SELENIUM_URL: http://test-browser:4444
```

## Monitoring Shared Memory Usage

To figure out the right `shm_size` for your containers, monitor actual usage.

```bash
# Check shared memory usage inside a running container
docker exec my-container df -h /dev/shm

# Check shared memory segments (POSIX shared memory)
docker exec my-container ls -la /dev/shm/

# Check System V shared memory
docker exec my-container ipcs -m

# Monitor shared memory usage over time
watch -n 5 'docker exec my-container df -h /dev/shm'
```

For PostgreSQL specifically:

```bash
# Check PostgreSQL shared memory usage
docker exec my-postgres psql -U postgres -c "SHOW shared_buffers;"
docker exec my-postgres psql -U postgres -c "SELECT * FROM pg_shmem_allocations ORDER BY size DESC LIMIT 10;"
```

## shm_size vs tmpfs

Some guides suggest mounting a tmpfs volume at `/dev/shm` as an alternative to `shm_size`. This works but is less clean.

```yaml
# Using tmpfs mount instead of shm_size (alternative approach)
services:
  app:
    image: my-app:latest
    tmpfs:
      - /dev/shm:size=1g

# Preferred approach: use shm_size directly
services:
  app:
    image: my-app:latest
    shm_size: "1g"
```

The `shm_size` directive is the recommended approach. It is purpose-built for this exact configuration and makes your intent clear.

## Memory Budgeting

Shared memory comes from your host's RAM. Allocating 2GB of `shm_size` means that 2GB of host RAM is reserved for that container's shared memory space, on top of the container's regular memory usage.

```yaml
# Budget memory properly: shm_size + container memory = total
services:
  postgres:
    image: postgres:16
    shm_size: "512m"
    deploy:
      resources:
        limits:
          memory: 2g    # This INCLUDES the shm_size allocation
        reservations:
          memory: 1g
```

Be aware that the memory limit set by `deploy.resources.limits.memory` includes the shared memory allocation. If you set a 2GB memory limit and 512MB of `shm_size`, your application has roughly 1.5GB left for its own use.

Getting shared memory right is a small configuration change that prevents frustrating crashes. Check what your applications actually need, set `shm_size` accordingly, and monitor usage to make sure you are not over-allocating. Your PostgreSQL databases, headless browsers, and ML training jobs will run smoothly.
