# Validation Summary: How to Implement Authentication in Flask

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Python
- Flask
- Flask-Login
- Flask-SQLAlchemy
- Werkzeug (security module: `generate_password_hash`, `check_password_hash`)
- Jinja2 templates
- SQLite (via SQLAlchemy)

## Sources Consulted
- Werkzeug source on the installed system (verified default hashing method by importing `werkzeug.security.generate_password_hash` against Werkzeug 3.1.8)
- Werkzeug changelog/docs: https://werkzeug.palletsprojects.com/en/stable/utils/#module-werkzeug.security (default changed to `scrypt` in Werkzeug 2.3.0)
- Flask-Login docs: https://flask-login.readthedocs.io/en/latest/ (LoginManager configuration: `login_view`, `login_message`, `session_protection`, `REMEMBER_COOKIE_DURATION` default 365 days, `UserMixin` properties)
- Flask docs: https://flask.palletsprojects.com/ (`flash`, `request.form`, `url_for`, `render_template`, `redirect`)
- Flask-SQLAlchemy docs: https://flask-sqlalchemy.palletsprojects.com/ (`db.Model`, `db.Column`, `db.create_all`, `Model.query`)
- Werkzeug security source confirms `DEFAULT_PBKDF2_ITERATIONS = 1_000_000` and default `method="scrypt"` in current versions

## Issues Found
- **Outdated Werkzeug default hashing claim.** The post originally stated that the default `generate_password_hash` method is "PBKDF2 with SHA-256 and 260,000 iterations" and showed an example hash starting with `pbkdf2:sha256:260000$...`. That was correct for Werkzeug 2.2.x and earlier, but Werkzeug 2.3.0 (April 2023) changed the default method to `scrypt` (params `32768:8:1`), and Werkzeug 3.x also raised `DEFAULT_PBKDF2_ITERATIONS` to 1,000,000. I confirmed this on the local install (Werkzeug 3.1.8) — `generate_password_hash("test")` returns a string starting with `scrypt:32768:8:1$...`. Updated the example hash format and the surrounding explanation to reflect the current default while noting that PBKDF2 is still available via `method="pbkdf2"`.

## Review Notes
- `User.query.get(int(user_id))` in the `user_loader` is the legacy SQLAlchemy 1.x query API. It still works under Flask-SQLAlchemy 3.x with SQLAlchemy 2.x but is considered legacy; the modern equivalent is `db.session.get(User, int(user_id))`. Left as-is because it is functionally correct and matches the style of most existing Flask tutorials.
- The login view does `return redirect(next_page)` without validating that `next_page` is a safe relative URL. This is a known open-redirect pitfall flagged in the Flask-Login docs. The code as written is functional, and fixing it would require adding new content (a URL-safety helper), which is outside the scope of "fix technical errors only." Worth calling out to the author for a follow-up since the post carries a `Security` tag.
- `app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'` is clearly labeled as a placeholder and the "Wrapping Up" section gives the correct command (`secrets.token_hex(32)`) to generate a real key — accurate.
- `REMEMBER_COOKIE_DURATION` default of 365 days, `session_protection` accepting `"basic"`/`"strong"`/`None`, and the `UserMixin` properties (`is_authenticated`, `is_active`, `is_anonymous`, `get_id`) all match the current Flask-Login docs.
- Circular import pattern (`models.py` does `from app import db`, `app.py` does `from models import User`) works because the post explicitly places the `from models import User` line after `db` is constructed; this is a standard Flask pattern.
