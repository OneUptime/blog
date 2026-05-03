# How to Deploy Celery Workers with Redis Broker via Portainer - Deploy Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Celery, Redis, Python, Portainer, Docker, Task Queue, Background Job

Description: Deploy a Celery distributed task queue with Redis as the message broker using Portainer stacks, including worker scaling, monitoring with Flower, and beat scheduler configuration.

---

Celery is the most popular Python task queue for background job processing. Combined with Redis as the message broker and result backend, it provides a reliable distributed task processing system that scales horizontally.

## Step 1: Deploy the Celery Stack

```yaml
# celery-stack.yml

version: "3.8"
services:
  # Redis as message broker and result backend
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - celery-net

  # Django/Flask web application
  webapp:
    image: myapp:1.2.3
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
    ports:
      - "8080:8080"
    restart: unless-stopped
    networks:
      - celery-net

  # Celery worker - processes tasks from the queue
  celery-worker:
    image: myapp:1.2.3    # Same image as webapp - has the task definitions
    command: celery -A myapp.celery worker --loglevel=info --concurrency=4
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - celery-net

  # Celery Beat - scheduled task runner
  celery-beat:
    image: myapp:1.2.3
    command: celery -A myapp.celery beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - celery-net

  # Flower - web-based Celery monitoring
  flower:
    image: mher/flower:2.0
    command: celery flower --broker=redis://redis:6379/0
    environment:
      - FLOWER_PORT=5555
      - FLOWER_BASIC_AUTH=admin:flower_password
    ports:
      - "5555:5555"
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - celery-net

volumes:
  redis-data:

networks:
  celery-net:
    driver: bridge
```

## Step 2: Define Celery Tasks

```python
# tasks.py - define the tasks processed by workers
from celery import Celery
import os

app = Celery("myapp")
app.config_from_object("celeryconfig")

@app.task(bind=True, max_retries=3)
def process_image(self, image_path):
    """Background image processing task."""
    try:
        # Image processing logic here
        result = compress_image(image_path)
        return {"status": "success", "output": result}
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@app.task
def send_email(to, subject, body):
    """Send an email in the background."""
    # Email sending logic
    return {"sent": True, "to": to}
```

## Step 3: Configure Celery

```python
# celeryconfig.py
import os

broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

# Task routing - send different tasks to different queues
task_routes = {
    "tasks.process_image": {"queue": "image-processing"},
    "tasks.send_email": {"queue": "email"},
}

# Worker queues - specify which queues each worker processes
# In Portainer, add environment variable: CELERY_QUEUES=image-processing
```

## Step 4: Scale Workers in Portainer

Scale Celery workers via Portainer's stack update:

```yaml
celery-worker:
  image: myapp:1.2.3
  command: celery -A myapp.celery worker --loglevel=info
  deploy:
    replicas: 5    # Scale up for more throughput
```

Or use Portainer's **Services > Scale** button to adjust worker count dynamically.

## Monitoring with Flower

Access the Flower dashboard at `http://host:5555` (with basic auth configured above) to:
- View active, reserved, and failed tasks
- Monitor worker status and performance
- Revoke or retry failed tasks
- View task rate graphs

## Summary

Celery with Redis via Portainer provides a production-ready background task processing system. Scale workers independently from your web application, monitor tasks via Flower, and use Celery Beat for scheduled tasks. Portainer's stack management makes it easy to update worker images and scale the worker pool.
