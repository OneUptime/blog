# How to Configure Flask-Session with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Flask, Session, Flask-Session, Authentication

Description: Learn how to configure Flask-Session with Redis to store server-side sessions, set TTLs, and handle session data securely in Flask applications.

---

By default, Flask stores session data in a signed cookie on the client. For larger session payloads, server-side storage, or multi-server deployments, Flask-Session stores sessions in Redis instead.

## Installation

```bash
pip install "Flask-Session[redis]"
```

## Configuration

```python
from flask import Flask, session
from flask_session import Session

app = Flask(__name__)
app.secret_key = "your-very-secret-key"

app.config["SESSION_TYPE"] = "redis"
app.config["SESSION_REDIS"] = None  # auto-connect to localhost
# Or provide a specific connection:
import redis
app.config["SESSION_REDIS"] = redis.Redis(host="localhost", port=6379, db=1)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True      # deprecated since 0.7.0; safe to omit
app.config["SESSION_KEY_PREFIX"] = "session:"
app.config["PERMANENT_SESSION_LIFETIME"] = 3600  # 1 hour

Session(app)
```

## Using Sessions in Routes

The session API is identical to Flask's default cookie sessions:

```python
from flask import request, redirect, url_for, jsonify

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    # validate credentials...
    if data.get("password") == "secret":
        session["user_id"] = 42
        session["username"] = data["username"]
        return jsonify({"status": "logged in"})
    return jsonify({"error": "invalid credentials"}), 401

@app.route("/profile")
def profile():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    return jsonify({"user_id": user_id, "username": session.get("username")})

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "logged out"})
```

## Setting Per-Session TTL

Make a session permanent and adjust its lifetime dynamically:

```python
from datetime import timedelta

@app.route("/login", methods=["POST"])
def login():
    session.permanent = True
    app.permanent_session_lifetime = timedelta(hours=2)
    session["user_id"] = 42
    return jsonify({"status": "ok"})
```

## Inspecting Sessions in Redis

Session keys are stored as `session:{session_id}` by default:

```bash
redis-cli -n 1 keys "session:*"
redis-cli -n 1 ttl "session:abc123..."
```

## Redis Connection with TLS

```python
import redis
import ssl

app.config["SESSION_REDIS"] = redis.Redis(
    host="redis.example.com",
    port=6380,
    ssl=True,
    ssl_cert_reqs=ssl.CERT_REQUIRED,
    ssl_ca_certs="/etc/ssl/certs/ca-certificates.crt",
    password="redis_password",
    db=1,
)
```

## Session Invalidation

```python
@app.route("/invalidate-all-sessions", methods=["POST"])
def invalidate_sessions():
    # Requires direct Redis access
    r = app.config["SESSION_REDIS"]
    keys = r.keys("session:*")
    if keys:
        r.delete(*keys)
    return jsonify({"deleted": len(keys)})
```

## Summary

Flask-Session with Redis stores sessions server-side using the Redis key `{SESSION_KEY_PREFIX}{session_id}`. Use `session.permanent = True` with `PERMANENT_SESSION_LIFETIME` to control TTL. The session interface in your routes remains identical to Flask's default cookie sessions.
