# How to Implement Structured JSON Logging for Python Applications Running in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Kubernetes, Logging

Description: Learn how to implement structured JSON logging in Python applications deployed on Kubernetes using python-json-logger and structlog libraries for efficient log aggregation and analysis.

---

Python's standard logging module outputs plain text by default, making logs difficult to parse and query in production Kubernetes environments. Structured JSON logging solves this by formatting logs as JSON objects, enabling powerful filtering and aggregation in Loki, Elasticsearch, and other log management systems.

This guide shows you how to configure production-grade structured logging for Python applications in Kubernetes.

## Using python-json-logger

The simplest approach uses python-json-logger to add JSON formatting to Python's standard logging:

```python
# requirements.txt
python-json-logger==2.0.7

# logger_config.py
import logging
import os
from pythonjsonlogger import jsonlogger

def setup_logger(name: str) -> logging.Logger:
    """Configure structured JSON logger for Kubernetes."""

    logger = logging.getLogger(name)
    logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

    # Create console handler
    handler = logging.StreamHandler()

    # Create JSON formatter
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s %(pathname)s %(lineno)d',
        rename_fields={
            'levelname': 'level',
            'asctime': 'timestamp',
            'name': 'logger',
            'pathname': 'file',
            'lineno': 'line'
        },
        timestamp=True
    )

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Add Kubernetes metadata as default fields
    logger = logging.LoggerAdapter(logger, {
        'namespace': os.getenv('NAMESPACE', 'unknown'),
        'pod': os.getenv('POD_NAME', 'unknown'),
        'node': os.getenv('NODE_NAME', 'unknown'),
        'service': os.getenv('SERVICE_NAME', 'python-app')
    })

    return logger

# app.py
from logger_config import setup_logger

logger = setup_logger(__name__)

def main():
    logger.info('Application started', extra={
        'version': '1.0.0',
        'port': 8000
    })

    try:
        process_data()
    except Exception as e:
        logger.error('Failed to process data', extra={
            'error': str(e),
            'error_type': type(e).__name__
        }, exc_info=True)
```

Deploy with environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-app
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        image: python-app:latest
        env:
        - name: LOG_LEVEL
          value: "INFO"
        - name: SERVICE_NAME
          value: "python-app"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

## Using structlog for Advanced Logging

Structlog provides more sophisticated structured logging:

```python
# requirements.txt
structlog==23.2.0

# logger_config.py
import os
import sys
import structlog

def setup_structlog():
    """Configure structlog with JSON output for Kubernetes."""

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Create base logger with Kubernetes context
    logger = structlog.get_logger()
    logger = logger.bind(
        namespace=os.getenv('NAMESPACE', 'unknown'),
        pod=os.getenv('POD_NAME', 'unknown'),
        node=os.getenv('NODE_NAME', 'unknown'),
        service=os.getenv('SERVICE_NAME', 'python-app')
    )

    return logger

# app.py
from logger_config import setup_structlog

logger = setup_structlog()

def main():
    logger.info('application_started', version='1.0.0', port=8000)

    # Log with additional context
    logger.info('processing_request',
                user_id='user123',
                request_id='req_abc123',
                endpoint='/api/users')

    # Log errors with context
    try:
        risky_operation()
    except Exception as e:
        logger.error('operation_failed',
                     operation='risky_operation',
                     error=str(e),
                     error_type=type(e).__name__,
                     exc_info=True)
```

## Flask Application Logging

Integrate structured logging with Flask:

```python
# requirements.txt
flask==3.0.0
python-json-logger==2.0.7

# app.py
from flask import Flask, request, g
import logging
import time
import uuid
from pythonjsonlogger import jsonlogger

app = Flask(__name__)

# Configure JSON logging
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)

app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

@app.before_request
def before_request():
    """Add request context to logs."""
    g.start_time = time.time()
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

@app.after_request
def after_request(response):
    """Log request completion."""
    duration = time.time() - g.start_time

    app.logger.info('request_completed', extra={
        'request_id': g.request_id,
        'method': request.method,
        'path': request.path,
        'status_code': response.status_code,
        'duration_ms': round(duration * 1000, 2),
        'remote_addr': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', ''),
    })

    # Add request ID to response
    response.headers['X-Request-ID'] = g.request_id
    return response

@app.route('/api/users/<user_id>')
def get_user(user_id):
    """Example endpoint with logging."""
    app.logger.info('fetching_user', extra={
        'request_id': g.request_id,
        'user_id': user_id
    })

    try:
        user = fetch_user_from_db(user_id)
        return {'user': user}, 200
    except Exception as e:
        app.logger.error('failed_to_fetch_user', extra={
            'request_id': g.request_id,
            'user_id': user_id,
            'error': str(e),
            'error_type': type(e).__name__
        }, exc_info=True)
        return {'error': 'Internal server error'}, 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

## FastAPI Application Logging

Structured logging with FastAPI:

```python
# requirements.txt
fastapi==0.109.0
uvicorn==0.27.0
python-json-logger==2.0.7

# logger_config.py
import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(message)s',
        rename_fields={'levelname': 'level'},
        timestamp=True
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

# main.py
from fastapi import FastAPI, Request
from logger_config import setup_logging
import logging
import time
import uuid

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests."""
    request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    start_time = time.time()

    logger.info('request_started', extra={
        'request_id': request_id,
        'method': request.method,
        'path': request.url.path,
        'client_ip': request.client.host
    })

    response = await call_next(request)

    duration = time.time() - start_time

    logger.info('request_completed', extra={
        'request_id': request_id,
        'method': request.method,
        'path': request.url.path,
        'status_code': response.status_code,
        'duration_ms': round(duration * 1000, 2)
    })

    response.headers['X-Request-ID'] = request_id
    return response

@app.get("/api/items/{item_id}")
async def read_item(item_id: str):
    logger.info('fetching_item', extra={'item_id': item_id})
    return {"item_id": item_id}
```

## Database Query Logging

Log database operations with context:

```python
import logging
import time
from contextlib import contextmanager
from sqlalchemy import event, create_engine

logger = logging.getLogger(__name__)

@contextmanager
def log_query_execution(query_type: str):
    """Context manager for logging query execution."""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        logger.info('query_executed', extra={
            'query_type': query_type,
            'duration_ms': round(duration * 1000, 2)
        })

        if duration > 1.0:
            logger.warning('slow_query', extra={
                'query_type': query_type,
                'duration_ms': round(duration * 1000, 2)
            })

# SQLAlchemy event listeners
def setup_db_logging(engine):
    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.time()
        logger.debug('query_starting', extra={'query': statement[:100]})

    @event.listens_for(engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        duration = time.time() - context._query_start_time
        logger.info('query_executed', extra={
            'query': statement[:100],
            'duration_ms': round(duration * 1000, 2),
            'row_count': cursor.rowcount
        })

        if duration > 1.0:
            logger.warning('slow_query', extra={
                'query': statement,
                'duration_ms': round(duration * 1000, 2)
            })

# Usage
engine = create_engine('postgresql://user:pass@localhost/db')
setup_db_logging(engine)
```

## Celery Task Logging

Log asynchronous Celery tasks:

```python
# celery_config.py
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
import logging
import time

logger = logging.getLogger(__name__)

app = Celery('tasks', broker='redis://redis:6379/0')

@task_prerun.connect
def task_prerun_handler(task_id, task, *args, **kwargs):
    """Log task start."""
    logger.info('task_started', extra={
        'task_id': task_id,
        'task_name': task.name,
        'args': str(args),
        'kwargs': str(kwargs)
    })

@task_postrun.connect
def task_postrun_handler(task_id, task, *args, retval=None, **kwargs):
    """Log task completion."""
    logger.info('task_completed', extra={
        'task_id': task_id,
        'task_name': task.name,
        'result': str(retval)
    })

@task_failure.connect
def task_failure_handler(task_id, exception, *args, **kwargs):
    """Log task failure."""
    logger.error('task_failed', extra={
        'task_id': task_id,
        'error': str(exception),
        'error_type': type(exception).__name__
    }, exc_info=True)

@app.task
def process_data(data_id: str):
    """Example task with logging."""
    logger.info('processing_data', extra={'data_id': data_id})

    try:
        # Process data
        result = perform_processing(data_id)
        logger.info('data_processed', extra={
            'data_id': data_id,
            'result_count': len(result)
        })
        return result
    except Exception as e:
        logger.error('processing_failed', extra={
            'data_id': data_id,
            'error': str(e)
        }, exc_info=True)
        raise
```

## OpenTelemetry Integration

Add trace context to logs:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
import logging

tracer_provider = TracerProvider()
trace.set_tracer_provider(tracer_provider)
tracer = trace.get_tracer(__name__)

logger = logging.getLogger(__name__)

def log_with_trace(message: str, **kwargs):
    """Log with trace context."""
    span = trace.get_current_span()
    if span:
        span_context = span.get_span_context()
        kwargs['trace_id'] = format(span_context.trace_id, '032x')
        kwargs['span_id'] = format(span_context.span_id, '016x')

    logger.info(message, extra=kwargs)

# Usage
with tracer.start_as_current_span("process_request"):
    log_with_trace('processing_request', user_id='user123')
```

## Best Practices Configuration

Production-ready logging configuration:

```python
# logging_config.py
import os
import logging
import sys
from pythonjsonlogger import jsonlogger

def configure_logging():
    """Configure production logging."""

    # Get log level from environment
    log_level = os.getenv('LOG_LEVEL', 'INFO')

    # Create formatter
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        rename_fields={
            'levelname': 'level',
            'name': 'logger'
        },
        timestamp=True
    )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add stdout handler for normal logs
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    stdout_handler.setLevel(logging.DEBUG)
    root_logger.addHandler(stdout_handler)

    # Add stderr handler for errors
    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setFormatter(formatter)
    stderr_handler.setLevel(logging.ERROR)
    root_logger.addHandler(stderr_handler)

    # Reduce noise from third-party libraries
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)

    return root_logger
```

## Conclusion

Structured JSON logging transforms Python applications from producing unstructured text to generating queryable, analyzable data. Whether using python-json-logger for simplicity or structlog for advanced features, structured logging enables powerful log aggregation and analysis in Kubernetes environments. Combined with Kubernetes metadata and trace context, your logs become a comprehensive observability data source that scales from development to production.
