# How to Use Redis as PHP Session Handler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PHP, Session, Session Handler, phpredis, Predis

Description: Learn how to configure Redis as a PHP session handler using native phpredis extension and custom Predis-based session handlers for scalable session management.

---

## Why Use Redis for PHP Sessions?

Default file-based PHP sessions fail in multi-server environments. Redis sessions provide:
- Shared session state across all web servers
- Automatic expiry via TTL
- Sub-millisecond session reads
- Easy session revocation

## Method 1: Using phpredis Extension (Recommended)

Install the phpredis C extension:

```bash
# Ubuntu/Debian
sudo apt-get install php-redis

# Or via PECL
pecl install redis
```

Configure in `php.ini` or a custom `.ini` file:

```ini
; Use Redis for session storage
session.save_handler = redis
session.save_path = "tcp://127.0.0.1:6379"

; With password
; session.save_path = "tcp://127.0.0.1:6379?auth=yourpassword"

; With TLS
; session.save_path = "tls://redis.example.com:6380?auth=password"

; Session TTL (1 hour)
session.gc_maxlifetime = 3600

; Session cookie settings
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
```

Verify it works:

```php
<?php

// Start session
session_start();

// Store data
$_SESSION['user_id'] = 1001;
$_SESSION['username'] = 'alice';
$_SESSION['role'] = 'admin';

echo "Session ID: " . session_id() . PHP_EOL;
echo "User: " . $_SESSION['username'] . PHP_EOL;
```

## Verifying Sessions Are in Redis

```bash
# Check for session keys
redis-cli KEYS "PHPREDIS_SESSION:*"

# View a session value
redis-cli GET "PHPREDIS_SESSION:abc123..."

# Check TTL
redis-cli TTL "PHPREDIS_SESSION:abc123..."
```

## Method 2: Custom Predis Session Handler

For environments without phpredis, implement a custom session handler:

```php
<?php

require 'vendor/autoload.php';

use Predis\Client;

class RedisSessionHandler implements SessionHandlerInterface {
    private Client $redis;
    private int $ttl;
    private string $prefix;

    public function __construct(Client $redis, int $ttl = 3600, string $prefix = 'sess:') {
        $this->redis  = $redis;
        $this->ttl    = $ttl;
        $this->prefix = $prefix;
    }

    public function open(string $savePath, string $sessionName): bool {
        return true;
    }

    public function close(): bool {
        return true;
    }

    public function read(string $sessionId): string|false {
        $data = $this->redis->get($this->prefix . $sessionId);
        return $data !== null ? $data : '';
    }

    public function write(string $sessionId, string $data): bool {
        $this->redis->setex($this->prefix . $sessionId, $this->ttl, $data);
        return true;
    }

    public function destroy(string $sessionId): bool {
        $this->redis->del($this->prefix . $sessionId);
        return true;
    }

    public function gc(int $maxLifetime): int|false {
        // Redis handles expiry via TTL - no manual GC needed
        return 0;
    }
}

// Register the custom handler
$redis = new Client(['host' => '127.0.0.1', 'port' => 6379]);
$handler = new RedisSessionHandler($redis, 3600, 'sess:');

session_set_save_handler($handler, true);
session_start();

$_SESSION['user_id'] = 1001;
$_SESSION['cart'] = ['item1', 'item2'];

echo "Session stored in Redis" . PHP_EOL;
```

## Laravel Configuration

In `config/session.php`:

```php
return [
    'driver'     => env('SESSION_DRIVER', 'redis'),
    'lifetime'   => env('SESSION_LIFETIME', 120),
    'expire_on_close' => false,
    'encrypt'    => false,
    'secure'     => env('SESSION_SECURE_COOKIE', true),
    'http_only'  => true,
    'same_site'  => 'lax',
    'connection' => 'default', // Redis connection from config/database.php
];
```

In `.env`:

```text
SESSION_DRIVER=redis
SESSION_LIFETIME=120
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Symfony Configuration

In `config/packages/framework.yaml`:

```yaml
framework:
    session:
        handler_id: Symfony\Component\HttpFoundation\Session\Storage\Handler\RedisSessionHandler
        cookie_secure: auto
        cookie_samesite: lax

services:
    Redis:
        class: Redis
        calls:
            - connect:
                - '%env(REDIS_HOST)%'
                - '%env(int:REDIS_PORT)%'

    Symfony\Component\HttpFoundation\Session\Storage\Handler\RedisSessionHandler:
        arguments:
            - '@Redis'
            - { prefix: 'sess:', ttl: 3600 }
```

## Session Security Best Practices

```php
<?php

// Session configuration for security
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');

session_start();

// Regenerate session ID after login to prevent fixation
function login(int $userId, string $username): void {
    session_regenerate_id(true); // true = delete old session

    $_SESSION['user_id']    = $userId;
    $_SESSION['username']   = $username;
    $_SESSION['login_time'] = time();
    $_SESSION['ip']         = $_SERVER['REMOTE_ADDR'];
    $_SESSION['ua']         = $_SERVER['HTTP_USER_AGENT'];
}

// Validate session integrity
function validateSession(): bool {
    if (!isset($_SESSION['user_id'])) {
        return false;
    }

    // Check for IP/UA changes (optional, can cause issues with mobile)
    if ($_SESSION['ip'] !== $_SERVER['REMOTE_ADDR']) {
        session_destroy();
        return false;
    }

    return true;
}

// Logout
function logout(): void {
    $_SESSION = [];
    session_destroy();
    session_start();
    session_regenerate_id(true);
}
```

## Monitoring Session Count

```php
<?php

use Predis\Client;

$redis = new Client();

// Count active sessions (phpredis prefix)
$keys = $redis->keys('PHPREDIS_SESSION:*');
echo "Active sessions: " . count($keys) . PHP_EOL;

// Or with custom prefix
$keys = $redis->keys('sess:*');
echo "Active sessions (custom): " . count($keys) . PHP_EOL;
```

## Summary

Redis as a PHP session handler is configured either via `php.ini` with the phpredis extension (`session.save_handler = redis`) or through a custom `SessionHandlerInterface` implementation using Predis. The phpredis approach is the most performant and requires minimal code. For frameworks, Laravel and Symfony both have first-class Redis session support. Always use `session_regenerate_id(true)` after login to prevent session fixation attacks, and set `httpOnly`, `secure`, and `samesite` cookie flags for production security.
