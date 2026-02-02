# How to Implement OAuth2 in Django

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Django, OAuth2, Authentication, Security

Description: Learn how to implement OAuth2 authentication in Django using django-allauth or python-social-auth for Google, GitHub, and other providers.

---

OAuth2 has become the standard for handling third-party authentication. Instead of managing passwords yourself, you let providers like Google or GitHub handle the heavy lifting. Users get a familiar login flow, and you avoid storing sensitive credentials.

In this guide, we will set up OAuth2 in Django using django-allauth - a battle-tested library that handles the OAuth dance, token management, and user creation for you.

## Why OAuth2?

Before diving into code, here is why OAuth2 makes sense:

- Users do not need to create yet another password
- You offload authentication security to companies that specialize in it
- Social login can increase conversion rates significantly
- You still get user info (email, name, avatar) without managing credentials

## Setting Up django-allauth

First, install the required packages:

```bash
pip install django-allauth
```

Now add the required apps to your `settings.py`:

```python
# settings.py

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Required by allauth

    # Allauth apps
    'allauth',
    'allauth.account',
    'allauth.socialaccount',

    # Provider apps - add the ones you need
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
]

# Site ID is required by allauth
SITE_ID = 1

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Default Django auth
    'allauth.account.auth_backends.AuthenticationBackend',  # Allauth
]
```

Add the allauth middleware:

```python
# settings.py

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',  # Add this line
]
```

## Configuring Allauth Settings

Here are the essential settings you will want to configure:

```python
# settings.py

# Allauth configuration
ACCOUNT_LOGIN_ON_GET = True
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_VERIFICATION = 'optional'  # or 'mandatory' for stricter security

# Redirect URLs after login/logout
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = '/'

# For development, you can use console email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

## Setting Up URL Routes

Add the allauth URLs to your project:

```python
# urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),  # This adds all auth URLs
]
```

This single include gives you these routes:

| URL Pattern | Purpose |
|-------------|---------|
| `/accounts/login/` | Login page with social options |
| `/accounts/logout/` | Logout endpoint |
| `/accounts/signup/` | Registration page |
| `/accounts/google/login/` | Initiate Google OAuth |
| `/accounts/github/login/` | Initiate GitHub OAuth |
| `/accounts/social/connections/` | Manage connected accounts |

## Configuring OAuth Providers

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID credentials
5. Set the authorized redirect URI to: `http://localhost:8000/accounts/google/login/callback/`

Add your credentials in Django admin or via settings:

```python
# settings.py

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'OAUTH_PKCE_ENABLED': True,
    }
}
```

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set the callback URL to: `http://localhost:8000/accounts/github/login/callback/`

```python
# settings.py

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        # ... google config from above
    },
    'github': {
        'SCOPE': [
            'user',
            'read:user',
            'user:email',
        ],
    }
}
```

## Adding Provider Credentials

Run migrations first:

```bash
python manage.py migrate
```

Now add your OAuth credentials. You can do this through the Django admin:

1. Go to `/admin/`
2. Navigate to Sites and update the domain to `localhost:8000` (or your domain)
3. Go to Social Applications and add a new application for each provider

Or do it programmatically:

```python
# management/commands/setup_oauth.py

from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

class Command(BaseCommand):
    help = 'Set up OAuth providers'

    def handle(self, *args, **options):
        # Update the site domain
        site = Site.objects.get(id=1)
        site.domain = 'localhost:8000'
        site.name = 'My App'
        site.save()

        # Create Google OAuth app
        google_app, created = SocialApp.objects.get_or_create(
            provider='google',
            defaults={
                'name': 'Google',
                'client_id': 'your-google-client-id',
                'secret': 'your-google-client-secret',
            }
        )
        google_app.sites.add(site)

        # Create GitHub OAuth app
        github_app, created = SocialApp.objects.get_or_create(
            provider='github',
            defaults={
                'name': 'GitHub',
                'client_id': 'your-github-client-id',
                'secret': 'your-github-client-secret',
            }
        )
        github_app.sites.add(site)

        self.stdout.write(self.style.SUCCESS('OAuth providers configured'))
```

## Custom User Model Integration

If you are using a custom user model (which you should), allauth works with it seamlessly:

```python
# models.py

from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Add custom fields
    avatar_url = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.email or self.username
```

Update your settings:

```python
# settings.py
AUTH_USER_MODEL = 'yourapp.CustomUser'
```

## Handling OAuth Callbacks with Signals

You can hook into the OAuth flow using Django signals:

```python
# signals.py

from django.dispatch import receiver
from allauth.account.signals import user_signed_up, user_logged_in
from allauth.socialaccount.signals import social_account_added, pre_social_login

@receiver(user_signed_up)
def handle_user_signed_up(request, user, **kwargs):
    """
    Called when a new user signs up - either via social or regular signup.
    Good place to send welcome emails or set up default settings.
    """
    print(f"New user signed up: {user.email}")
    # Send welcome email, create default preferences, etc.

@receiver(social_account_added)
def handle_social_account_added(request, sociallogin, **kwargs):
    """
    Called when a social account is connected to an existing user.
    Useful for syncing profile data from the provider.
    """
    user = sociallogin.user
    social_data = sociallogin.account.extra_data

    # Sync avatar URL from provider
    if sociallogin.account.provider == 'google':
        user.avatar_url = social_data.get('picture', '')
    elif sociallogin.account.provider == 'github':
        user.avatar_url = social_data.get('avatar_url', '')

    user.save()

@receiver(pre_social_login)
def handle_pre_social_login(request, sociallogin, **kwargs):
    """
    Called before the social login is processed.
    Good for linking accounts if the email already exists.
    """
    # Check if user with this email already exists
    email = sociallogin.account.extra_data.get('email')
    if email:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            existing_user = User.objects.get(email=email)
            # Connect the social account to existing user
            sociallogin.connect(request, existing_user)
        except User.DoesNotExist:
            pass
```

Register your signals in your app config:

```python
# apps.py

from django.apps import AppConfig

class YourappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'yourapp'

    def ready(self):
        import yourapp.signals  # noqa
```

## Creating Login Templates

Create a custom login template with social buttons:

```html
<!-- templates/account/login.html -->

{% extends "base.html" %}
{% load socialaccount %}

{% block content %}
<div class="login-container">
    <h1>Sign In</h1>

    <!-- Social login buttons -->
    <div class="social-login">
        <a href="{% provider_login_url 'google' %}" class="btn btn-google">
            Continue with Google
        </a>
        <a href="{% provider_login_url 'github' %}" class="btn btn-github">
            Continue with GitHub
        </a>
    </div>

    <div class="divider">or</div>

    <!-- Regular email login form -->
    <form method="post" action="{% url 'account_login' %}">
        {% csrf_token %}
        {{ form.as_p }}
        <button type="submit">Sign In</button>
    </form>

    <p>
        Don't have an account?
        <a href="{% url 'account_signup' %}">Sign up</a>
    </p>
</div>
{% endblock %}
```

## Token Management for API Access

If you need to access provider APIs on behalf of users, you can retrieve their tokens:

```python
# views.py

from allauth.socialaccount.models import SocialToken, SocialAccount

def get_github_repos(request):
    """
    Example: Fetch user's GitHub repositories using their OAuth token.
    """
    import requests

    # Get the user's GitHub social account
    try:
        social_account = SocialAccount.objects.get(
            user=request.user,
            provider='github'
        )
        token = SocialToken.objects.get(account=social_account)
    except (SocialAccount.DoesNotExist, SocialToken.DoesNotExist):
        return {'error': 'GitHub account not connected'}

    # Use the token to make API requests
    headers = {'Authorization': f'token {token.token}'}
    response = requests.get(
        'https://api.github.com/user/repos',
        headers=headers
    )

    return response.json()
```

## Production Checklist

Before deploying, make sure you have:

| Item | Setting/Action |
|------|----------------|
| HTTPS enabled | Required for OAuth callbacks in production |
| Update callback URLs | Change from localhost to your production domain |
| Set ALLOWED_HOSTS | Include your production domain |
| Update Site object | Set correct domain in Django admin |
| Environment variables | Store client IDs and secrets securely |
| Email verification | Consider setting to 'mandatory' |

```python
# production settings example
import os

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
        }
    },
    'github': {
        'APP': {
            'client_id': os.environ.get('GITHUB_CLIENT_ID'),
            'secret': os.environ.get('GITHUB_CLIENT_SECRET'),
        }
    }
}
```

## Wrapping Up

OAuth2 with django-allauth takes care of the complexity of token exchange, session management, and user creation. The library is actively maintained and supports dozens of providers beyond Google and GitHub.

The key things to remember:
- Always use HTTPS in production
- Store credentials in environment variables, not in code
- Use signals to customize the authentication flow
- Test the complete flow including edge cases like existing users with matching emails

Start with one provider, get it working end to end, then add more as needed. The configuration pattern is the same across all providers - just different scopes and callback URLs.
