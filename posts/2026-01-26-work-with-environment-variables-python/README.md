# How to Work with Environment Variables in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Environment Variables, Configuration, Security, DevOps, Best Practices

Description: Learn how to read, set, and manage environment variables in Python applications. This guide covers os.environ, python-dotenv, validation strategies, and security best practices.

---

> Environment variables are the standard way to configure applications across different environments. They keep sensitive data like API keys out of your code and allow you to change configuration without modifying source files.

This guide covers everything you need to know about working with environment variables in Python, from basic usage to production-ready patterns.

---

## Basic Operations with os.environ

### Reading Environment Variables

```python
# basic_env.py
# Reading environment variables with os.environ
import os

# Get an environment variable (returns None if not set)
database_url = os.environ.get('DATABASE_URL')
print(f"Database URL: {database_url}")

# Get with a default value
debug_mode = os.environ.get('DEBUG', 'false')
print(f"Debug mode: {debug_mode}")

# Get a required variable (raises KeyError if not set)
try:
    api_key = os.environ['API_KEY']
except KeyError:
    print("Error: API_KEY environment variable is required")

# Check if a variable exists
if 'DATABASE_URL' in os.environ:
    print("Database URL is configured")

# Get all environment variables
all_vars = dict(os.environ)
print(f"Total environment variables: {len(all_vars)}")
```

### Setting Environment Variables

```python
# setting_env.py
# Setting environment variables in Python
import os

# Set an environment variable for the current process
os.environ['MY_VARIABLE'] = 'my_value'

# The variable is now available
print(os.environ.get('MY_VARIABLE'))  # Output: my_value

# Note: This only affects the current process and child processes
# It does not persist after the program exits

# Update an existing variable
os.environ['PATH'] = f"/custom/path:{os.environ.get('PATH', '')}"

# Delete an environment variable
if 'MY_VARIABLE' in os.environ:
    del os.environ['MY_VARIABLE']

# Or use pop with a default
removed = os.environ.pop('MY_VARIABLE', None)
```

---

## Using python-dotenv

The python-dotenv library loads environment variables from a `.env` file, which is ideal for development.

### Installation and Setup

```bash
pip install python-dotenv
```

```python
# .env file in your project root
# DATABASE_URL=postgresql://localhost/mydb
# API_KEY=your-secret-key
# DEBUG=true
# MAX_CONNECTIONS=10
```

### Loading Environment Variables

```python
# load_dotenv.py
# Loading environment variables from .env file
from dotenv import load_dotenv
import os

# Load variables from .env file
# By default, looks for .env in the current directory
load_dotenv()

# Now access variables as usual
database_url = os.environ.get('DATABASE_URL')
api_key = os.environ.get('API_KEY')

print(f"Database: {database_url}")

# Load from a specific file
load_dotenv('/path/to/custom.env')

# Override existing environment variables
load_dotenv(override=True)

# Load and get value in one step
from dotenv import dotenv_values

# Returns a dictionary without modifying os.environ
config = dotenv_values('.env')
print(config.get('API_KEY'))
```

### Auto-Loading at Startup

```python
# config.py
# Automatically load .env at module import
from pathlib import Path
from dotenv import load_dotenv

# Find the .env file relative to this file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# For Flask applications
# In your app factory or main module:
from dotenv import load_dotenv
load_dotenv()  # Must be before importing app configuration
```

---

## Type Conversion and Validation

Environment variables are always strings. You need to convert them to appropriate types.

```python
# type_conversion.py
# Converting environment variables to proper types
import os
from typing import Optional

def get_bool(key: str, default: bool = False) -> bool:
    """Get a boolean from environment variable."""
    value = os.environ.get(key, '').lower()
    if value in ('true', '1', 'yes', 'on'):
        return True
    if value in ('false', '0', 'no', 'off'):
        return False
    return default

def get_int(key: str, default: int = 0) -> int:
    """Get an integer from environment variable."""
    value = os.environ.get(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default

def get_float(key: str, default: float = 0.0) -> float:
    """Get a float from environment variable."""
    value = os.environ.get(key)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default

def get_list(key: str, separator: str = ',', default: list = None) -> list:
    """Get a list from a comma-separated environment variable."""
    value = os.environ.get(key)
    if value is None:
        return default or []
    return [item.strip() for item in value.split(separator) if item.strip()]

# Usage
DEBUG = get_bool('DEBUG', default=False)
PORT = get_int('PORT', default=8000)
RATE_LIMIT = get_float('RATE_LIMIT', default=1.5)
ALLOWED_HOSTS = get_list('ALLOWED_HOSTS', default=['localhost'])
```

---

## Configuration Classes

### Dataclass-Based Configuration

```python
# config_dataclass.py
# Structured configuration with dataclasses
from dataclasses import dataclass, field
from typing import List, Optional
import os

@dataclass
class DatabaseConfig:
    """Database configuration."""
    url: str
    pool_size: int = 5
    max_overflow: int = 10
    echo: bool = False

    @classmethod
    def from_env(cls) -> 'DatabaseConfig':
        """Create config from environment variables."""
        return cls(
            url=os.environ['DATABASE_URL'],
            pool_size=int(os.environ.get('DB_POOL_SIZE', '5')),
            max_overflow=int(os.environ.get('DB_MAX_OVERFLOW', '10')),
            echo=os.environ.get('DB_ECHO', '').lower() == 'true'
        )

@dataclass
class AppConfig:
    """Application configuration."""
    debug: bool = False
    secret_key: str = ''
    allowed_hosts: List[str] = field(default_factory=list)
    database: Optional[DatabaseConfig] = None

    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create complete config from environment."""
        hosts = os.environ.get('ALLOWED_HOSTS', 'localhost')

        return cls(
            debug=os.environ.get('DEBUG', '').lower() == 'true',
            secret_key=os.environ.get('SECRET_KEY', 'change-me'),
            allowed_hosts=[h.strip() for h in hosts.split(',')],
            database=DatabaseConfig.from_env()
        )

# Usage
from dotenv import load_dotenv
load_dotenv()

config = AppConfig.from_env()
print(f"Debug: {config.debug}")
print(f"Database URL: {config.database.url}")
```

### Using Pydantic for Validation

```python
# config_pydantic.py
# Configuration with automatic validation using Pydantic
from pydantic import BaseSettings, validator, Field
from typing import List, Optional

class Settings(BaseSettings):
    """Application settings with validation."""

    # Required variables
    database_url: str = Field(..., env='DATABASE_URL')
    secret_key: str = Field(..., env='SECRET_KEY')

    # Optional with defaults
    debug: bool = Field(False, env='DEBUG')
    port: int = Field(8000, env='PORT')
    log_level: str = Field('INFO', env='LOG_LEVEL')

    # List from comma-separated string
    allowed_hosts: List[str] = Field(['localhost'], env='ALLOWED_HOSTS')

    # Nested settings
    redis_url: Optional[str] = Field(None, env='REDIS_URL')

    @validator('allowed_hosts', pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse comma-separated hosts into a list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(',')]
        return v

    @validator('log_level')
    def validate_log_level(cls, v):
        """Ensure log level is valid."""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {valid_levels}")
        return v.upper()

    class Config:
        # Load from .env file automatically
        env_file = '.env'
        env_file_encoding = 'utf-8'
        case_sensitive = False

# Usage
settings = Settings()
print(f"Debug: {settings.debug}")
print(f"Port: {settings.port}")
print(f"Allowed hosts: {settings.allowed_hosts}")
```

---

## Environment-Specific Configuration

```python
# multi_env_config.py
# Different configurations for different environments
import os
from dataclasses import dataclass
from abc import ABC

@dataclass
class BaseConfig(ABC):
    """Base configuration class."""
    APP_NAME: str = "MyApp"
    SECRET_KEY: str = ""
    DEBUG: bool = False

@dataclass
class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///dev.db"
    LOG_LEVEL: str = "DEBUG"

@dataclass
class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    TESTING: bool = True
    DATABASE_URL: str = "sqlite:///:memory:"
    LOG_LEVEL: str = "WARNING"

@dataclass
class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    DEBUG: bool = False
    DATABASE_URL: str = ""  # Must be set via environment
    LOG_LEVEL: str = "INFO"

    def __post_init__(self):
        # Validate required production settings
        self.DATABASE_URL = os.environ.get('DATABASE_URL', '')
        self.SECRET_KEY = os.environ.get('SECRET_KEY', '')

        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL is required in production")
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY is required in production")

def get_config():
    """Get configuration based on environment."""
    env = os.environ.get('FLASK_ENV', 'development').lower()

    config_map = {
        'development': DevelopmentConfig,
        'testing': TestingConfig,
        'production': ProductionConfig,
    }

    config_class = config_map.get(env, DevelopmentConfig)
    return config_class()

# Usage
config = get_config()
print(f"Running in: {os.environ.get('FLASK_ENV', 'development')}")
print(f"Debug: {config.DEBUG}")
```

---

## Security Best Practices

### Never Commit Secrets

```bash
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

### Example .env Files

```bash
# .env.example - Commit this file to show required variables
DATABASE_URL=postgresql://user:password@localhost/dbname
API_KEY=your-api-key-here
SECRET_KEY=generate-a-secure-key

# .env - Never commit this file
DATABASE_URL=postgresql://realuser:realpassword@prod-server/production
API_KEY=sk-live-xxxxxxxxxxxxx
SECRET_KEY=super-secure-random-string
```

### Validating Required Variables

```python
# validate_env.py
# Validate all required environment variables at startup
import os
import sys

def validate_environment():
    """Validate that all required environment variables are set."""
    required_vars = [
        'DATABASE_URL',
        'SECRET_KEY',
        'API_KEY',
    ]

    missing = []
    for var in required_vars:
        if not os.environ.get(var):
            missing.append(var)

    if missing:
        print("ERROR: Missing required environment variables:")
        for var in missing:
            print(f"  - {var}")
        print("\nPlease set these variables and try again.")
        sys.exit(1)

# Call at application startup
if __name__ == "__main__":
    validate_environment()
    print("All required environment variables are set!")
```

---

## Framework Integration

### Flask

```python
# flask_config.py
from flask import Flask
from dotenv import load_dotenv
import os

# Load .env before creating app
load_dotenv()

app = Flask(__name__)

# Configure from environment
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key')
app.config['DEBUG'] = os.environ.get('DEBUG', 'false').lower() == 'true'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
```

### FastAPI

```python
# fastapi_config.py
from fastapi import FastAPI
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "My API"
    debug: bool = False
    database_url: str

    class Config:
        env_file = ".env"

settings = Settings()
app = FastAPI(title=settings.app_name, debug=settings.debug)
```

---

## Conclusion

Environment variables are essential for configuring Python applications:

- Use `os.environ.get()` with defaults for optional variables
- Use python-dotenv for local development
- Create configuration classes for structured settings
- Use Pydantic for automatic validation
- Never commit sensitive values to version control
- Validate required variables at application startup

Following these practices keeps your configuration secure and your applications portable across environments.

---

*Managing configuration across environments? [OneUptime](https://oneuptime.com) helps you monitor your applications and track configuration-related issues in production.*

