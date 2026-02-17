# How to Configure Flask Session Management Using Firestore as a Session Backend on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Flask, Firestore, Cloud Run, Session Management

Description: Learn how to configure Flask to use Firestore as a session backend for scalable session management when deploying to Cloud Run.

---

Flask's default session storage uses signed cookies, which works fine for small amounts of data. But when you need to store more session data, share sessions across multiple container instances, or invalidate sessions server-side, you need a server-side session backend. On Cloud Run, where multiple container instances can handle requests for the same user, Firestore is a natural choice. It is fast, serverless, and scales automatically.

## The Problem with Cookie-Based Sessions on Cloud Run

Cloud Run scales horizontally by adding container instances. If user A makes a request that hits instance 1, their next request might hit instance 2. With cookie-based sessions, the session data travels with the cookie, so this works fine. But cookie sessions have size limits (about 4KB), and you cannot invalidate them server-side. If you need to log a user out from the server, or store complex session data, you need a shared backend.

## Setting Up the Project

Install the required packages.

```bash
# Install Flask and the Firestore client
pip install flask google-cloud-firestore flask-session
```

## Building a Custom Firestore Session Interface

Flask-Session supports Redis, Memcached, and other backends, but not Firestore out of the box. Let me build a custom session interface.

```python
# firestore_session.py - Custom Firestore session backend for Flask
from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict
from google.cloud import firestore
from datetime import datetime, timezone, timedelta
import uuid
import json

class FirestoreSession(CallbackDict, SessionMixin):
    """A server-side session backed by Firestore."""

    def __init__(self, initial=None, sid=None, permanent=None):
        def on_update(self):
            self.modified = True

        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        self.modified = False
        if permanent is not None:
            self.permanent = permanent


class FirestoreSessionInterface(SessionInterface):
    """Flask session interface that stores sessions in Firestore."""

    def __init__(self, db=None, collection="flask_sessions", expiry_hours=24):
        # Initialize the Firestore client
        self.db = db or firestore.Client()
        self.collection = collection
        self.expiry_hours = expiry_hours

    def _get_session_ref(self, sid):
        """Get a reference to the session document in Firestore."""
        return self.db.collection(self.collection).document(sid)

    def open_session(self, app, request):
        """Load an existing session or create a new one."""
        # Look for the session ID in the cookie
        sid = request.cookies.get(app.config.get("SESSION_COOKIE_NAME", "session"))

        if sid:
            # Try to load the session from Firestore
            doc = self._get_session_ref(sid).get()
            if doc.exists:
                data = doc.to_dict()

                # Check if the session has expired
                expires_at = data.get("expires_at")
                if expires_at and expires_at < datetime.now(timezone.utc):
                    # Session expired, delete it and create a new one
                    self._get_session_ref(sid).delete()
                else:
                    # Session is valid, load the data
                    session_data = json.loads(data.get("data", "{}"))
                    return FirestoreSession(session_data, sid=sid)

        # No valid session found, create a new one
        sid = str(uuid.uuid4())
        return FirestoreSession(sid=sid)

    def save_session(self, app, session, response):
        """Save the session to Firestore and set the cookie."""
        domain = self.get_cookie_domain(app)
        cookie_name = app.config.get("SESSION_COOKIE_NAME", "session")

        # If the session is empty, delete it
        if not session:
            if session.modified:
                self._get_session_ref(session.sid).delete()
                response.delete_cookie(cookie_name, domain=domain)
            return

        # Calculate expiry time
        if session.permanent:
            expires = datetime.now(timezone.utc) + app.permanent_session_lifetime
        else:
            expires = datetime.now(timezone.utc) + timedelta(hours=self.expiry_hours)

        # Save the session data to Firestore
        session_data = {
            "data": json.dumps(dict(session)),
            "expires_at": expires,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "sid": session.sid,
        }

        self._get_session_ref(session.sid).set(session_data)

        # Set the session cookie
        response.set_cookie(
            cookie_name,
            session.sid,
            expires=expires,
            httponly=True,
            secure=True,
            samesite="Lax",
            domain=domain,
        )
```

## Integrating with Flask

Wire the custom session interface into your Flask application.

```python
# app.py - Flask application with Firestore sessions
from flask import Flask, session, redirect, url_for, request, jsonify
from firestore_session import FirestoreSessionInterface
from google.cloud import firestore
import os

app = Flask(__name__)

# Set a secret key for signing the session cookie
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "change-this-in-production")

# Configure the Firestore session backend
db = firestore.Client()
app.session_interface = FirestoreSessionInterface(
    db=db,
    collection="flask_sessions",
    expiry_hours=24,
)

@app.route("/")
def index():
    """Show the current session data."""
    visits = session.get("visits", 0)
    session["visits"] = visits + 1
    return jsonify({
        "message": "Hello!",
        "visits": session["visits"],
        "user": session.get("username"),
    })

@app.route("/login", methods=["POST"])
def login():
    """Log in a user and store their info in the session."""
    data = request.get_json()
    username = data.get("username")
    if not username:
        return jsonify({"error": "Username required"}), 400

    # Store user info in the session
    session["username"] = username
    session["logged_in"] = True
    session["login_time"] = str(datetime.now(timezone.utc))

    return jsonify({"message": f"Logged in as {username}"})

@app.route("/logout")
def logout():
    """Clear the session to log out."""
    session.clear()
    return jsonify({"message": "Logged out"})

@app.route("/profile")
def profile():
    """Protected route that requires a session."""
    if not session.get("logged_in"):
        return jsonify({"error": "Not logged in"}), 401

    return jsonify({
        "username": session["username"],
        "login_time": session.get("login_time"),
        "visits": session.get("visits", 0),
    })

from datetime import datetime, timezone

if __name__ == "__main__":
    app.run(debug=True, port=8080)
```

## Session Cleanup

Expired sessions accumulate in Firestore and should be cleaned up periodically. Use a scheduled Cloud Function.

```python
# cleanup.py - Scheduled function to delete expired sessions
import functions_framework
from google.cloud import firestore
from datetime import datetime, timezone

@functions_framework.http
def cleanup_sessions(request):
    """Delete expired sessions from Firestore."""
    db = firestore.Client()
    now = datetime.now(timezone.utc)

    # Query for expired sessions
    expired_docs = (
        db.collection("flask_sessions")
        .where("expires_at", "<", now)
        .limit(500)  # Process in batches
        .stream()
    )

    # Delete expired sessions in a batch
    batch = db.batch()
    count = 0

    for doc in expired_docs:
        batch.delete(doc.reference)
        count += 1

        # Firestore batch limit is 500 operations
        if count >= 500:
            batch.commit()
            batch = db.batch()

    if count > 0:
        batch.commit()

    return f"Deleted {count} expired sessions"
```

Deploy the cleanup function with a Cloud Scheduler trigger.

```bash
# Deploy the cleanup function
gcloud functions deploy cleanup-sessions \
    --gen2 \
    --runtime=python311 \
    --entry-point=cleanup_sessions \
    --trigger-http \
    --region=us-central1

# Create a Cloud Scheduler job to run cleanup every hour
gcloud scheduler jobs create http cleanup-sessions-job \
    --schedule="0 * * * *" \
    --uri="https://us-central1-my-project.cloudfunctions.net/cleanup-sessions" \
    --http-method=GET \
    --oidc-service-account-email=my-scheduler-sa@my-project.iam.gserviceaccount.com
```

## Deploying to Cloud Run

Package and deploy the Flask application.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD exec gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4
```

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/my-project/flask-app

gcloud run deploy flask-app \
    --image gcr.io/my-project/flask-app \
    --region us-central1 \
    --set-secrets="FLASK_SECRET_KEY=flask-secret-key:latest" \
    --memory 256Mi \
    --allow-unauthenticated
```

## Session Security Considerations

A few important security measures for production sessions.

```python
# Additional security configuration for the Flask app
app.config.update(
    SESSION_COOKIE_SECURE=True,      # Only send cookie over HTTPS
    SESSION_COOKIE_HTTPONLY=True,     # Prevent JavaScript access to the cookie
    SESSION_COOKIE_SAMESITE="Lax",   # Prevent CSRF via cross-site requests
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
)
```

## Monitoring Session Health

When sessions break, users get logged out unexpectedly or see stale data. OneUptime (https://oneuptime.com) can monitor your Flask application on Cloud Run and alert you when error rates increase, which often correlates with session backend issues.

## Summary

Using Firestore as a Flask session backend gives you scalable, server-side sessions that work across multiple Cloud Run container instances. The custom session interface handles loading, saving, and expiring sessions automatically. Remember to clean up expired sessions with a scheduled function, use secure cookie settings in production, and keep session data small since every request that touches the session makes a Firestore round trip. This approach works well for applications with moderate session sizes and provides the server-side control that cookie-based sessions lack.
