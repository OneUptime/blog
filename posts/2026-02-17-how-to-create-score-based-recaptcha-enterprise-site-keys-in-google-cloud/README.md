# How to Create Score-Based reCAPTCHA Enterprise Site Keys in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, reCAPTCHA Enterprise, Bot Protection, Security, Web Security

Description: A step-by-step guide to creating and configuring score-based reCAPTCHA Enterprise site keys in Google Cloud for invisible bot detection on your web applications.

---

If you have been using reCAPTCHA v3 for bot detection, reCAPTCHA Enterprise is the grown-up version. It gives you better detection accuracy, more granular scoring, reason codes for why a score is low, and integration with other Google Cloud security services. Score-based keys are the most popular type - they work invisibly in the background without any user interaction, returning a score from 0.0 (likely bot) to 1.0 (likely human).

In this post, I will walk through creating score-based site keys in reCAPTCHA Enterprise and integrating them into a web application.

## Score-Based vs Checkbox vs WAF Keys

reCAPTCHA Enterprise offers several key types:

- **Score-based**: Invisible, returns a risk score. Best for most use cases.
- **Checkbox**: The classic "I'm not a robot" checkbox. Use when you want visible verification.
- **WAF (Web Application Firewall)**: Designed for integration with Cloud Armor or other WAFs.

Score-based keys are what most teams want. They do not interrupt the user experience and give you a numeric score to make your own risk decisions.

## Prerequisites

- A GCP project with billing enabled
- reCAPTCHA Enterprise API enabled
- A web application where you want to add bot protection
- The reCAPTCHA Enterprise Admin role

## Step 1: Enable the reCAPTCHA Enterprise API

```bash
# Enable the reCAPTCHA Enterprise API
gcloud services enable recaptchaenterprise.googleapis.com --project=PROJECT_ID
```

## Step 2: Create a Score-Based Site Key

You can create the key via `gcloud`, the API, or the console. Here is the `gcloud` approach:

```bash
# Create a score-based reCAPTCHA Enterprise site key
gcloud recaptcha keys create \
  --display-name="My Website Score Key" \
  --web \
  --integration-type=SCORE \
  --domains="example.com,www.example.com,staging.example.com" \
  --project=PROJECT_ID
```

The `--domains` flag restricts where this key can be used. Only requests from those domains will be accepted. For development, you might want to add `localhost` as well.

The command outputs a key ID that looks something like `6Ld_example_key_here`. Save this - you will need it for both frontend and backend integration.

## Step 3: Add reCAPTCHA Enterprise to Your Frontend

Add the reCAPTCHA Enterprise JavaScript to your web pages. This script runs in the background and collects signals about user behavior.

```html
<!-- Load reCAPTCHA Enterprise with your site key -->
<script src="https://www.google.com/recaptcha/enterprise.js?render=YOUR_SITE_KEY"></script>
```

Then execute reCAPTCHA when the user performs an action you want to protect:

```javascript
// Execute reCAPTCHA when a user submits a form
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Request a reCAPTCHA token for the 'login' action
    grecaptcha.enterprise.ready(async function() {
        const token = await grecaptcha.enterprise.execute('YOUR_SITE_KEY', {
            action: 'login'
        });

        // Add the token to your form data
        document.getElementById('recaptcha-token').value = token;

        // Now submit the form
        event.target.submit();
    });
});
```

The `action` parameter is important - it labels the interaction so you can analyze different actions separately in the reCAPTCHA Enterprise dashboard (login vs signup vs checkout, etc.).

## Step 4: Verify the Token on Your Backend

The frontend token means nothing on its own. You must verify it on your backend by calling the reCAPTCHA Enterprise API.

Here is a Python backend verification:

```python
from google.cloud import recaptchaenterprise_v1

def verify_recaptcha(project_id, site_key, token, action, user_ip=None):
    """Verify a reCAPTCHA Enterprise token and return the assessment."""

    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

    # Build the assessment request
    event = recaptchaenterprise_v1.Event(
        site_key=site_key,
        token=token,
        user_ip_address=user_ip,
        expected_action=action,
    )

    assessment = recaptchaenterprise_v1.Assessment(event=event)

    project_name = f"projects/{project_id}"

    # Create the assessment
    response = client.create_assessment(
        parent=project_name,
        assessment=assessment,
    )

    # Check if the token is valid
    if not response.token_properties.valid:
        print(f"Token invalid: {response.token_properties.invalid_reason.name}")
        return None

    # Check the action matches what we expected
    if response.token_properties.action != action:
        print(f"Action mismatch: expected '{action}', got '{response.token_properties.action}'")
        return None

    # Get the risk score (0.0 = bot, 1.0 = human)
    score = response.risk_analysis.score
    reasons = [r.name for r in response.risk_analysis.reasons]

    print(f"Score: {score}")
    print(f"Reasons: {reasons}")

    return {
        "score": score,
        "reasons": reasons,
        "valid": True,
    }

# Example usage in a Flask route
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/login', methods=['POST'])
def login():
    token = request.form.get('recaptcha-token')

    result = verify_recaptcha(
        project_id="my-project",
        site_key="YOUR_SITE_KEY",
        token=token,
        action="login",
        user_ip=request.remote_addr,
    )

    if result is None:
        return jsonify({"error": "reCAPTCHA verification failed"}), 403

    # Decide what to do based on the score
    if result["score"] < 0.3:
        # Very likely a bot - block the request
        return jsonify({"error": "Suspected automated access"}), 403
    elif result["score"] < 0.7:
        # Suspicious - require additional verification
        return jsonify({"requires_2fa": True}), 200
    else:
        # Likely human - proceed with login
        return jsonify({"status": "ok"}), 200
```

## Step 5: Set Up Score Thresholds

The score is just a number. You need to decide what to do at different score levels. There is no universal threshold - it depends on your risk tolerance and the action being protected.

Here is a pattern I have found works well:

```python
# Score threshold configuration per action
SCORE_THRESHOLDS = {
    "login": {
        "block": 0.3,        # Below this: block outright
        "challenge": 0.7,    # Below this: require additional verification
        "allow": 0.7,        # Above this: allow through
    },
    "signup": {
        "block": 0.3,
        "challenge": 0.5,    # Stricter for signup (more bot target)
        "allow": 0.5,
    },
    "checkout": {
        "block": 0.5,        # Stricter for financial actions
        "challenge": 0.8,
        "allow": 0.8,
    },
    "comment": {
        "block": 0.2,        # More lenient for low-risk actions
        "challenge": 0.5,
        "allow": 0.5,
    },
}

def evaluate_score(action, score):
    """Determine the action to take based on score and thresholds."""
    thresholds = SCORE_THRESHOLDS.get(action, SCORE_THRESHOLDS["login"])

    if score < thresholds["block"]:
        return "BLOCK"
    elif score < thresholds["challenge"]:
        return "CHALLENGE"
    else:
        return "ALLOW"
```

## Step 6: Annotate Assessments for Better Accuracy

reCAPTCHA Enterprise gets smarter when you tell it whether its assessments were correct. After you determine whether a login was legitimate or fraudulent, annotate the assessment:

```python
def annotate_assessment(project_id, assessment_name, is_legitimate):
    """Tell reCAPTCHA whether the assessment was correct."""

    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

    # LEGITIMATE if the user was real, FRAUDULENT if it was a bot
    annotation = (
        recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.LEGITIMATE
        if is_legitimate
        else recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.FRAUDULENT
    )

    client.annotate_assessment(
        request={
            "name": assessment_name,
            "annotation": annotation,
        }
    )

    print(f"Annotated {assessment_name} as {'legitimate' if is_legitimate else 'fraudulent'}")
```

## Step 7: Manage Keys with Terraform

For infrastructure-as-code management:

```hcl
# Score-based reCAPTCHA Enterprise key
resource "google_recaptcha_enterprise_key" "website_key" {
  display_name = "Production Website"
  project      = var.project_id

  web_settings {
    integration_type  = "SCORE"
    allowed_domains   = ["example.com", "www.example.com"]
    allow_amp_traffic = false
  }
}

# Output the key ID for use in application configuration
output "recaptcha_site_key" {
  value = google_recaptcha_enterprise_key.website_key.id
}
```

## Monitoring and Tuning

After deploying, monitor your score distributions in the reCAPTCHA Enterprise dashboard in the Cloud Console. Look for:

- The distribution of scores across actions (healthy sites typically cluster around 0.9)
- Spike in low scores (could indicate a bot attack)
- The reason codes returned for low scores
- False positive rate (legitimate users getting blocked)

Adjust your thresholds based on real data. Start lenient and tighten as you gather data about your traffic patterns.

## Summary

Score-based reCAPTCHA Enterprise keys give you invisible bot detection that runs in the background without interrupting users. Create the key with `gcloud`, add the JavaScript to your frontend, verify tokens on your backend, and make risk decisions based on the score. Annotate assessments to improve accuracy over time, and tune your score thresholds per action based on the risk level. The combination of invisible detection and flexible scoring lets you stop bots without adding friction for real users.
