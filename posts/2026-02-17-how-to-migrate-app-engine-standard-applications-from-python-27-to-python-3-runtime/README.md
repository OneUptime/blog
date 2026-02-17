# How to Migrate App Engine Standard Applications from Python 2.7 to Python 3 Runtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Python, Migration, Python 3

Description: A comprehensive migration guide for moving App Engine Standard applications from the Python 2.7 runtime to Python 3 with detailed code changes and bundled service replacements.

---

Google officially ended support for the Python 2.7 runtime on App Engine Standard. If you are still running a Python 2.7 application, it is past time to migrate. The migration involves more than just updating Python syntax - the Python 3 runtime on App Engine works fundamentally differently from the Python 2.7 runtime. The bundled services you relied on are gone, the WSGI framework integration changed, and the project structure is different.

In this guide, I will cover the major changes and show you how to handle each one.

## What Changed Between Runtimes

The Python 2.7 runtime used a special App Engine SDK with bundled services. The Python 3 runtime is just standard Python running behind a WSGI server. Here are the key differences:

- No more bundled services (Memcache, Task Queue, Blobstore, Users API, etc.)
- No more `appengine_config.py` for library vendoring
- No more `lib/` directory for third-party libraries
- Standard `requirements.txt` replaces `lib/` vendoring
- `webapp2` framework replaced by Flask, Django, or any WSGI framework
- No more `threadsafe: true` in `app.yaml`
- Different handler configuration in `app.yaml`

## Step 1: Update app.yaml

The `app.yaml` structure changes significantly.

Old Python 2.7 `app.yaml`:

```yaml
# OLD - Python 2.7 app.yaml
runtime: python27
api_version: 1
threadsafe: true

libraries:
  - name: jinja2
    version: latest
  - name: MySQLdb
    version: latest

handlers:
  - url: /static
    static_dir: static
  - url: /.*
    script: main.app

builtins:
  - deferred: on
```

New Python 3 `app.yaml`:

```yaml
# NEW - Python 3 app.yaml
runtime: python312

handlers:
  - url: /static
    static_dir: static
  - url: /.*
    script: auto    # Changed from 'main.app' to 'auto'

entrypoint: gunicorn -b :$PORT main:app

# No more api_version, threadsafe, libraries, or builtins sections
```

The `script: auto` directive tells App Engine to use the entrypoint to determine how to start your application. The `entrypoint` line specifies the command to start your server.

## Step 2: Replace webapp2 with Flask

Most Python 2.7 App Engine apps used `webapp2`. Replace it with Flask:

Old webapp2 code:

```python
# OLD - main.py using webapp2
import webapp2
from google.appengine.api import users

class MainHandler(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            self.response.write('Hello, ' + user.nickname())
        else:
            self.redirect(users.create_login_url(self.request.uri))

class DataHandler(webapp2.RequestHandler):
    def post(self):
        data = self.request.get('data')
        # Process data
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(json.dumps({'status': 'ok'}))

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/api/data', DataHandler),
], debug=True)
```

New Flask code:

```python
# NEW - main.py using Flask
from flask import Flask, request, jsonify, redirect

app = Flask(__name__)

@app.route("/")
def main_handler():
    # Users API replaced - use Identity-Aware Proxy or Firebase Auth
    return "Hello from Python 3 on App Engine"

@app.route("/api/data", methods=["POST"])
def data_handler():
    data = request.form.get("data")
    # Process data
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
```

Common mapping from webapp2 to Flask:

```python
# Request handling changes
# webapp2: self.request.get('param')
# Flask:   request.args.get('param')  (GET) or request.form.get('param') (POST)

# Response handling changes
# webapp2: self.response.write(content)
# Flask:   return content

# JSON responses
# webapp2: self.response.headers['Content-Type'] = 'application/json'
#          self.response.write(json.dumps(data))
# Flask:   return jsonify(data)

# Redirects
# webapp2: self.redirect('/some-url')
# Flask:   return redirect('/some-url')

# Error responses
# webapp2: self.error(404)
# Flask:   return "Not Found", 404
```

## Step 3: Replace Bundled Services

### Replace Memcache with Memorystore

```python
# OLD - App Engine Memcache
from google.appengine.api import memcache
value = memcache.get("my-key")
memcache.set("my-key", value, time=300)

# NEW - Memorystore Redis
import redis
r = redis.Redis(host=os.environ.get("REDIS_HOST"))
value = r.get("my-key")
r.setex("my-key", 300, value)
```

### Replace Task Queue with Cloud Tasks

```python
# OLD - App Engine Task Queue
from google.appengine.api import taskqueue
taskqueue.add(url="/tasks/process", params={"id": "123"})

# NEW - Cloud Tasks
from google.cloud import tasks_v2
client = tasks_v2.CloudTasksClient()
parent = client.queue_path(PROJECT, LOCATION, "default")
task = {
    "app_engine_http_request": {
        "http_method": tasks_v2.HttpMethod.POST,
        "relative_uri": "/tasks/process",
        "body": json.dumps({"id": "123"}).encode()
    }
}
client.create_task(request={"parent": parent, "task": task})
```

### Replace Users API with Identity-Aware Proxy

```python
# OLD - App Engine Users API
from google.appengine.api import users
user = users.get_current_user()
if user:
    email = user.email()

# NEW - Identity-Aware Proxy (IAP) headers
def get_current_user():
    # IAP adds these headers when a user is authenticated
    email = request.headers.get("X-Goog-Authenticated-User-Email", "")
    user_id = request.headers.get("X-Goog-Authenticated-User-ID", "")
    # Remove the accounts.google.com: prefix
    if email:
        email = email.replace("accounts.google.com:", "")
    return email, user_id
```

### Replace NDB/DB with Cloud NDB or Cloud Firestore

```python
# OLD - App Engine NDB
from google.appengine.ext import ndb

class MyModel(ndb.Model):
    name = ndb.StringProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)

entity = MyModel(name="test")
entity.put()

# NEW Option 1 - Cloud NDB (drop-in replacement)
from google.cloud import ndb

client = ndb.Client()

class MyModel(ndb.Model):
    name = ndb.StringProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)

with client.context():
    entity = MyModel(name="test")
    entity.put()

# NEW Option 2 - Cloud Firestore (recommended for new development)
from google.cloud import firestore

db = firestore.Client()
doc_ref = db.collection("my_collection").document()
doc_ref.set({"name": "test", "created": firestore.SERVER_TIMESTAMP})
```

### Replace Blobstore with Cloud Storage

```python
# OLD - App Engine Blobstore
from google.appengine.ext import blobstore
upload_url = blobstore.create_upload_url("/upload-handler")

# NEW - Cloud Storage
from google.cloud import storage

def upload_file(file_data, filename):
    client = storage.Client()
    bucket = client.bucket("your-bucket-name")
    blob = bucket.blob(filename)
    blob.upload_from_string(file_data)
    return blob.public_url
```

## Step 4: Update Dependencies

Remove the old `lib/` directory and `appengine_config.py`. Create a `requirements.txt`:

```
# requirements.txt - Python 3 dependencies
Flask==3.0.0
gunicorn==21.2.0
google-cloud-ndb==2.3.0        # If using Cloud NDB
google-cloud-firestore==2.14.0  # If using Firestore
google-cloud-storage==2.14.0    # If using Cloud Storage
google-cloud-tasks==2.15.0      # If using Cloud Tasks
redis==5.0.1                    # If using Memorystore
```

## Step 5: Fix Python 2 to 3 Syntax

Common syntax changes:

```python
# Print statement to function
# OLD: print "hello"
# NEW: print("hello")

# Integer division
# OLD: 5 / 2 = 2
# NEW: 5 // 2 = 2 (use // for integer division)

# Unicode strings (default in Python 3)
# OLD: u"unicode string"
# NEW: "unicode string" (all strings are unicode)

# Bytes vs strings
# OLD: "bytes and strings were interchangeable"
# NEW: b"bytes" vs "string" (distinct types)

# Dictionary methods
# OLD: dict.has_key("key")
# NEW: "key" in dict

# OLD: dict.iteritems()
# NEW: dict.items()

# Exception syntax
# OLD: except Exception, e:
# NEW: except Exception as e:

# Range
# OLD: xrange(10)
# NEW: range(10)
```

Use the `2to3` tool to automate many of these changes:

```bash
# Automatically convert Python 2 syntax to Python 3
2to3 -w your_module.py

# Preview changes without writing
2to3 your_module.py
```

## Step 6: Testing

Test your migrated application locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py

# Or with gunicorn (matching the entrypoint)
gunicorn -b :8080 main:app
```

Run your test suite with Python 3:

```bash
# Run tests
python -m pytest tests/ -v
```

## Step 7: Deploy

Deploy the migrated application:

```bash
# Deploy to a new version without routing traffic
gcloud app deploy app.yaml --no-promote --version=python3-test

# Test at the version-specific URL
# https://python3-test-dot-your-project.appspot.com

# If everything works, migrate traffic
gcloud app services set-traffic default --splits=python3-test=1
```

## Migration Checklist

Here is a condensed checklist:

1. Update `app.yaml` (remove `api_version`, `threadsafe`, `libraries`, `builtins`)
2. Replace `webapp2` with Flask
3. Create `requirements.txt` (remove `lib/` and `appengine_config.py`)
4. Replace each bundled service with its standalone equivalent
5. Fix Python 2 syntax issues
6. Update tests
7. Test locally with Python 3
8. Deploy as a new version and test
9. Migrate traffic to the new version
10. Clean up the old version

## Summary

Migrating from Python 2.7 to Python 3 on App Engine is a substantial effort, but it is necessary since the old runtime is no longer supported. The biggest changes are replacing bundled services with standalone GCP products and switching from webapp2 to Flask. Plan for at least a week of development time for a medium-sized application, plus thorough testing. Deploy as a new version alongside the old one so you can roll back quickly if issues appear in production.
