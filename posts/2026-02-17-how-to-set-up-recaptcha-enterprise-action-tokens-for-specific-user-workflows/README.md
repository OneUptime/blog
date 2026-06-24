# How to Set Up reCAPTCHA Enterprise Action Tokens for Specific User Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, ReCAPTCHA Enterprise, Action Tokens, Security, Web Application

Description: Learn how to implement reCAPTCHA Enterprise action tokens to protect specific user workflows like login, signup, checkout, and password reset with targeted bot detection.

---

Session tokens protect your entire site with continuous background monitoring when you use a WAF integration such as Google Cloud Armor. But some user actions need stronger protection - login attempts, account creation, password resets, checkout flows. These are the high-value targets that bots go after, and they deserve dedicated risk assessment.

Action-scoped reCAPTCHA tokens are the answer. Unlike session tokens that provide a general risk score for the user's browsing session, these tokens are generated for specific user actions at specific moments. The action name is returned in the assessment, and each token can be assessed only once. This gives you precise, per-action bot detection.

Note: Google Cloud also uses the term "action-token" for WAF integrations. In that flow, you create a WAF action-token key, send the token in the `X-Recaptcha-Token` header, and let Cloud Armor evaluate it. This guide covers score-based website keys where your backend creates a reCAPTCHA assessment.

## How Action-Scoped Tokens Differ from Session Tokens

| Feature | Session Token | Action-Scoped Token |
|---------|--------------|--------------|
| Generation | Automatic, background | Explicit, per action |
| Lifetime | Renewed periodically | Single use |
| Scope | Entire browsing session | Specific user action |
| Action label | No | Yes (login, signup, etc.) |
| Best for | General site protection | Protecting specific workflows |

You can use both simultaneously - session tokens for baseline protection and action-scoped tokens for critical endpoints.

## Prerequisites

- reCAPTCHA Enterprise API enabled
- A site key created for score-based integration
- A web application with user workflows to protect

## Step 1: Create a Score-Based Site Key

```bash
# Create a score-based key for action-scoped tokens

gcloud recaptcha keys create \
  --display-name="Action-Scoped Token Key" \
  --web \
  --integration-type=SCORE \
  --domains="example.com,www.example.com,localhost" \
  --project=PROJECT_ID
```

## Step 2: Implement Action-Scoped Tokens on the Frontend

Add the reCAPTCHA script and generate tokens at the moment of each protected action. After generating each token, send it to your backend and create the assessment within two minutes.

Here is a complete example for a login form:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
    <!-- Load reCAPTCHA Enterprise -->
    <script src="https://www.google.com/recaptcha/enterprise.js?render=YOUR_SITE_KEY"></script>
</head>
<body>
    <form id="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Log In</button>
    </form>

    <script>
    // Handle login form submission with an action-scoped token
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        try {
            // Generate a token specifically for the login action
            const token = await new Promise((resolve, reject) => {
                grecaptcha.enterprise.ready(function() {
                    grecaptcha.enterprise.execute('YOUR_SITE_KEY', {
                        action: 'login'
                    }).then(resolve).catch(reject);
                });
            });

            // Send the login request with the action-scoped token
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                    recaptchaToken: token,
                    recaptchaAction: 'login',
                }),
            });

            const result = await response.json();

            if (response.status === 403) {
                alert('Access denied. Please try again later.');
            } else if (result.requireChallenge) {
                // Show additional verification (CAPTCHA, 2FA, etc.)
                showAdditionalVerification();
            } else {
                // Login successful
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('reCAPTCHA error:', error);
            // Do not submit without a token; ask the user to retry
            alert('Verification failed. Please refresh and try again.');
        }
    });
    </script>
</body>
</html>
```

## Step 3: Protect Multiple Workflows

Here is how to add action-scoped tokens across different pages and workflows:

```javascript
// Reusable function to generate action-scoped tokens
async function getRecaptchaToken(action) {
    return new Promise((resolve, reject) => {
        grecaptcha.enterprise.ready(function() {
            grecaptcha.enterprise.execute('YOUR_SITE_KEY', { action: action })
                .then(resolve)
                .catch(reject);
        });
    });
}

// Signup flow
async function handleSignup(formData) {
    const token = await getRecaptchaToken('signup');
    return fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, recaptchaToken: token, recaptchaAction: 'signup' }),
    });
}

// Password reset flow
async function handlePasswordReset(email) {
    const token = await getRecaptchaToken('password_reset');
    return fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken: token, recaptchaAction: 'password_reset' }),
    });
}

// Checkout flow
async function handleCheckout(orderData) {
    const token = await getRecaptchaToken('checkout');
    return fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, recaptchaToken: token, recaptchaAction: 'checkout' }),
    });
}

// Comment submission
async function handleComment(commentText, postId) {
    const token = await getRecaptchaToken('post_comment');
    return fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText, recaptchaToken: token, recaptchaAction: 'post_comment' }),
    });
}
```

## Step 4: Backend Verification with Action Validation

The backend must verify both the token and the action. If a token was generated for "login" but is submitted to the signup endpoint, that is suspicious.

```python
from google.cloud import recaptchaenterprise_v1
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)

# Score thresholds per action
ACTION_THRESHOLDS = {
    "login": {"block": 0.3, "challenge": 0.7},
    "signup": {"block": 0.4, "challenge": 0.6},
    "checkout": {"block": 0.5, "challenge": 0.8},
    "password_reset": {"block": 0.4, "challenge": 0.7},
    "post_comment": {"block": 0.2, "challenge": 0.5},
}

def verify_action_token(project_id, site_key, token, expected_action):
    """Verify a reCAPTCHA token and validate the action matches."""

    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

    event = recaptchaenterprise_v1.Event(
        site_key=site_key,
        token=token,
        expected_action=expected_action,
    )

    assessment = recaptchaenterprise_v1.Assessment(event=event)

    response = client.create_assessment(
        parent=f"projects/{project_id}",
        assessment=assessment,
    )

    # Validate the token is legitimate
    if not response.token_properties.valid:
        return {
            "valid": False,
            "reason": response.token_properties.invalid_reason.name,
        }

    # Validate the action matches
    if response.token_properties.action != expected_action:
        return {
            "valid": False,
            "reason": f"Action mismatch: got {response.token_properties.action}",
        }

    score = response.risk_analysis.score
    thresholds = ACTION_THRESHOLDS.get(expected_action, {"block": 0.3, "challenge": 0.7})

    if score < thresholds["block"]:
        decision = "BLOCK"
    elif score < thresholds["challenge"]:
        decision = "CHALLENGE"
    else:
        decision = "ALLOW"

    return {
        "valid": True,
        "score": score,
        "decision": decision,
        "reasons": [r.name for r in response.risk_analysis.reasons],
        "assessment_name": response.name,
    }


# Decorator for protecting endpoints
def require_recaptcha(action):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            token = data.get("recaptchaToken")

            if not token:
                return jsonify({"error": "Missing reCAPTCHA token"}), 400

            result = verify_action_token(
                project_id="my-project",
                site_key="YOUR_SITE_KEY",
                token=token,
                expected_action=action,
            )

            if not result["valid"]:
                return jsonify({"error": "Invalid reCAPTCHA token"}), 403

            if result["decision"] == "BLOCK":
                return jsonify({"error": "Request blocked"}), 403

            if result["decision"] == "CHALLENGE":
                return jsonify({"requireChallenge": True}), 200

            # Attach the result to the request for the handler to use
            request.recaptcha_result = result
            return f(*args, **kwargs)

        return decorated_function
    return decorator


@app.route('/api/login', methods=['POST'])
@require_recaptcha('login')
def login():
    data = request.get_json()
    # Process login with confidence it is not a bot
    return jsonify({"status": "ok"})


@app.route('/api/signup', methods=['POST'])
@require_recaptcha('signup')
def signup():
    data = request.get_json()
    return jsonify({"status": "ok"})


@app.route('/api/checkout', methods=['POST'])
@require_recaptcha('checkout')
def checkout():
    data = request.get_json()
    return jsonify({"status": "ok"})
```

## Step 5: Annotate Assessments for Learning

Feed back outcomes to improve reCAPTCHA accuracy:

```python
def annotate_after_outcome(assessment_name, was_fraudulent, reason=None):
    """Report the outcome back to reCAPTCHA for model improvement."""

    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

    annotation = (
        recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.FRAUDULENT
        if was_fraudulent
        else recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.LEGITIMATE
    )

    reasons = []
    if reason:
        reason_map = {
            "correct_password": recaptchaenterprise_v1.AnnotateAssessmentRequest.Reason.CORRECT_PASSWORD,
            "incorrect_password": recaptchaenterprise_v1.AnnotateAssessmentRequest.Reason.INCORRECT_PASSWORD,
            "initiated_two_factor": recaptchaenterprise_v1.AnnotateAssessmentRequest.Reason.INITIATED_TWO_FACTOR,
            "passed_two_factor": recaptchaenterprise_v1.AnnotateAssessmentRequest.Reason.PASSED_TWO_FACTOR,
            "failed_two_factor": recaptchaenterprise_v1.AnnotateAssessmentRequest.Reason.FAILED_TWO_FACTOR,
            "social_spam": recaptchaenterprise_v1.AnnotateAssessmentRequest.Reason.SOCIAL_SPAM,
        }
        if reason in reason_map:
            reasons.append(reason_map[reason])

    client.annotate_assessment(
        request={
            "name": assessment_name,
            "annotation": annotation,
            "reasons": reasons,
        }
    )
```

## Debugging Action-Scoped Tokens

When action-scoped tokens are not working as expected, check these common issues:

- **Token expired**: Tokens returned by `grecaptcha.enterprise.execute()` expire after 2 minutes. If there is a long delay between generating the token and submitting the form, generate a new token.
- **Action mismatch**: Make sure the action string in `grecaptcha.enterprise.execute()` matches the `expected_action` in your backend verification.
- **Domain not allowed**: The request must come from a domain listed in the site key configuration.
- **Token reuse**: Tokens are single-use. If a request is retried with the same token, the second verification will fail.

## Summary

Action-scoped tokens give you precise, per-workflow bot detection for the user interactions that matter most. Generate tokens at the moment of each protected action on the frontend, verify both the token and action name on the backend, apply action-specific score thresholds, and annotate outcomes to improve accuracy. Combined with session tokens for baseline protection at the WAF layer, action-scoped tokens provide a layered defense that makes it hard for bots to target your most sensitive workflows.
