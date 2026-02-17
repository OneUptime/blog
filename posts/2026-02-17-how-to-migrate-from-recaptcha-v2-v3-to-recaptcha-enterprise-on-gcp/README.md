# How to Migrate from reCAPTCHA v2/v3 to reCAPTCHA Enterprise on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, reCAPTCHA Enterprise, Migration, Security, Web Applications

Description: A practical migration guide for moving from reCAPTCHA v2 or v3 to reCAPTCHA Enterprise on Google Cloud, covering frontend changes, backend verification updates, and testing strategies.

---

If your application uses reCAPTCHA v2 (the checkbox or invisible version) or reCAPTCHA v3 (the score-based version), migrating to reCAPTCHA Enterprise is worth the effort. Enterprise gives you better detection accuracy, reason codes explaining why scores are low, integration with other GCP security services, and more detailed analytics. The migration is also less disruptive than you might think - the frontend API is almost identical, and the biggest changes are on the backend verification side.

In this post, I will walk through migrating both v2 and v3 implementations to reCAPTCHA Enterprise.

## What Changes and What Stays the Same

Here is a quick comparison:

| Component | v2/v3 | Enterprise |
|-----------|-------|------------|
| Frontend JS | `recaptcha/api.js` | `recaptcha/enterprise.js` |
| Frontend API | `grecaptcha.execute()` | `grecaptcha.enterprise.execute()` |
| Backend verification | `siteverify` REST API | `createAssessment` gRPC/REST API |
| Site key | Obtained from reCAPTCHA admin console | Created in GCP console or via gcloud |
| Scoring | 0.0 to 1.0 (v3 only) | 0.0 to 1.0 (all types) |
| Reason codes | No | Yes |
| Assessment annotation | No | Yes |

The key takeaway: your frontend changes are minimal (swap a script URL and add `.enterprise` to API calls), but the backend verification needs to be rewritten to use the GCP assessment API.

## Step 1: Create Enterprise Site Keys

First, create new site keys in reCAPTCHA Enterprise. You can migrate your existing keys, but I recommend creating new ones so you can run both systems in parallel during testing.

```bash
# Create a score-based key (replaces v3 or invisible v2)
gcloud recaptcha keys create \
  --display-name="Production Score Key (migrated from v3)" \
  --web \
  --integration-type=SCORE \
  --domains="example.com,www.example.com,staging.example.com" \
  --project=PROJECT_ID

# Create a checkbox key (replaces v2 checkbox)
gcloud recaptcha keys create \
  --display-name="Production Checkbox Key (migrated from v2)" \
  --web \
  --integration-type=CHECKBOX \
  --domains="example.com,www.example.com" \
  --project=PROJECT_ID
```

Alternatively, you can migrate existing v2/v3 keys to Enterprise. This means you do not need to change the site key on your frontend:

```bash
# Migrate an existing legacy key to Enterprise
gcloud recaptcha keys migrate LEGACY_SITE_KEY \
  --project=PROJECT_ID
```

Key migration preserves the same site key ID so your frontend code does not need any key changes.

## Step 2: Update the Frontend - Score-Based (v3 Migration)

If you are migrating from v3, the frontend changes are minimal.

**Before (v3):**

```html
<script src="https://www.google.com/recaptcha/api.js?render=V3_SITE_KEY"></script>
<script>
grecaptcha.ready(function() {
    grecaptcha.execute('V3_SITE_KEY', {action: 'login'}).then(function(token) {
        // Send token to backend
        document.getElementById('recaptcha-token').value = token;
    });
});
</script>
```

**After (Enterprise):**

```html
<!-- Change the script URL to enterprise.js -->
<script src="https://www.google.com/recaptcha/enterprise.js?render=ENTERPRISE_SITE_KEY"></script>
<script>
// Add .enterprise to the API calls
grecaptcha.enterprise.ready(function() {
    grecaptcha.enterprise.execute('ENTERPRISE_SITE_KEY', {action: 'login'}).then(function(token) {
        // Send token to backend - same as before
        document.getElementById('recaptcha-token').value = token;
    });
});
</script>
```

That is it for the frontend. Two changes: the script URL and adding `.enterprise` to the API calls.

## Step 3: Update the Frontend - Checkbox (v2 Migration)

For v2 checkbox migration:

**Before (v2 checkbox):**

```html
<script src="https://www.google.com/recaptcha/api.js" async defer></script>
<div class="g-recaptcha" data-sitekey="V2_SITE_KEY"></div>
```

**After (Enterprise checkbox):**

```html
<!-- Change to enterprise.js -->
<script src="https://www.google.com/recaptcha/enterprise.js" async defer></script>
<!-- Same div, just update the site key if you created a new one -->
<div class="g-recaptcha" data-sitekey="ENTERPRISE_SITE_KEY"></div>
```

For programmatic v2 rendering:

```javascript
// Before (v2)
grecaptcha.render('recaptcha-container', {
    sitekey: 'V2_SITE_KEY',
    callback: onSuccess,
});

// After (Enterprise)
grecaptcha.enterprise.render('recaptcha-container', {
    sitekey: 'ENTERPRISE_SITE_KEY',
    callback: onSuccess,
});
```

## Step 4: Rewrite Backend Verification

This is the biggest change. The old `siteverify` endpoint is replaced by the GCP Assessment API.

**Before (v2/v3 verification):**

```python
import requests

def verify_recaptcha_legacy(token, secret_key, remote_ip=None):
    """Old v2/v3 verification using siteverify endpoint."""

    payload = {
        'secret': secret_key,
        'response': token,
    }
    if remote_ip:
        payload['remoteip'] = remote_ip

    response = requests.post(
        'https://www.google.com/recaptcha/api/siteverify',
        data=payload,
    )
    result = response.json()

    return {
        'success': result.get('success', False),
        'score': result.get('score'),  # v3 only
        'action': result.get('action'),  # v3 only
    }
```

**After (Enterprise verification):**

```python
from google.cloud import recaptchaenterprise_v1

def verify_recaptcha_enterprise(project_id, site_key, token, expected_action=None):
    """Enterprise verification using the Assessment API."""

    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

    # Build the event
    event = recaptchaenterprise_v1.Event(
        site_key=site_key,
        token=token,
    )

    if expected_action:
        event.expected_action = expected_action

    # Create the assessment
    assessment = recaptchaenterprise_v1.Assessment(event=event)

    response = client.create_assessment(
        parent=f"projects/{project_id}",
        assessment=assessment,
    )

    # Check token validity
    if not response.token_properties.valid:
        return {
            'success': False,
            'reason': response.token_properties.invalid_reason.name,
        }

    # Validate action if expected
    if expected_action and response.token_properties.action != expected_action:
        return {
            'success': False,
            'reason': 'action_mismatch',
        }

    return {
        'success': True,
        'score': response.risk_analysis.score,
        'action': response.token_properties.action,
        'reasons': [r.name for r in response.risk_analysis.reasons],
        'assessment_name': response.name,  # Save for annotation later
    }
```

Notice the key differences:

- No more secret key - authentication is handled by GCP service account credentials
- You get reason codes explaining low scores
- You get an assessment name that you can use for annotation (feedback)
- The response structure is richer

## Step 5: Update Your Score Logic

If you are migrating from v3, you probably have score threshold logic. Update it to take advantage of Enterprise's reason codes:

```python
def evaluate_recaptcha_result(result, action):
    """Evaluate a reCAPTCHA Enterprise result with reason code analysis."""

    if not result['success']:
        return {"decision": "BLOCK", "reason": result.get('reason')}

    score = result['score']
    reasons = result.get('reasons', [])

    # Check for specific reason codes that indicate automation
    automation_reasons = {'AUTOMATION', 'UNEXPECTED_ENVIRONMENT', 'TOO_MUCH_TRAFFIC'}
    if automation_reasons.intersection(set(reasons)):
        # Strong signal of automation regardless of score
        return {"decision": "BLOCK", "reason": "automation_detected"}

    # Action-specific thresholds
    thresholds = {
        'login': 0.5,
        'signup': 0.5,
        'checkout': 0.7,
        'comment': 0.3,
    }

    threshold = thresholds.get(action, 0.5)

    if score < threshold:
        return {"decision": "CHALLENGE", "reason": f"low_score_{score}"}

    return {"decision": "ALLOW", "reason": "passed"}
```

## Step 6: Implement a Gradual Rollout

Do not switch everything at once. Here is a safe migration strategy:

```python
import random

# Feature flag for gradual rollout
ENTERPRISE_ROLLOUT_PERCENTAGE = 10  # Start at 10%

def verify_recaptcha(token, action):
    """Route to either legacy or enterprise verification based on rollout percentage."""

    use_enterprise = random.randint(1, 100) <= ENTERPRISE_ROLLOUT_PERCENTAGE

    if use_enterprise:
        result = verify_recaptcha_enterprise(
            project_id="my-project",
            site_key="ENTERPRISE_KEY",
            token=token,
            expected_action=action,
        )
        # Log enterprise results for comparison
        log_recaptcha_result("enterprise", result, action)
    else:
        result = verify_recaptcha_legacy(token, "SECRET_KEY")
        log_recaptcha_result("legacy", result, action)

    return result
```

Increase the rollout percentage gradually as you verify that Enterprise is working correctly.

## Step 7: Run Both in Parallel for Comparison

During migration, run both verification systems and compare results:

```python
def verify_both_and_compare(token, action, secret_key):
    """Run both legacy and enterprise verification to compare results."""

    # Legacy verification
    legacy_result = verify_recaptcha_legacy(token, secret_key)

    # Enterprise verification
    enterprise_result = verify_recaptcha_enterprise(
        project_id="my-project",
        site_key="ENTERPRISE_KEY",
        token=token,
        expected_action=action,
    )

    # Compare scores
    legacy_score = legacy_result.get('score', 'N/A')
    enterprise_score = enterprise_result.get('score', 'N/A')

    print(f"Legacy score: {legacy_score}, Enterprise score: {enterprise_score}")

    # Use legacy result for now, log enterprise for analysis
    return legacy_result
```

## Common Migration Issues

**Token format differences.** Enterprise tokens are slightly different from v3 tokens. If you migrated your site key, both old and new tokens work. If you created a new key, make sure the frontend is using the new key.

**Authentication changes.** Legacy verification used a secret key in the request. Enterprise uses GCP service account authentication. Make sure your backend has proper GCP credentials configured.

**Response format.** The response structure is completely different. Any code that parses the `siteverify` JSON response needs to be updated for the Assessment response.

**Rate limits.** Enterprise has different rate limits than the free tier. Check your quota in the GCP console and request increases if needed.

## Summary

Migrating from reCAPTCHA v2/v3 to Enterprise is a straightforward process. Frontend changes are minimal - swap the script URL and add `.enterprise` to API calls. Backend changes are more significant - replace the `siteverify` endpoint with the GCP Assessment API. Take advantage of the migration to implement reason code analysis and assessment annotation. Roll out gradually, compare results between the old and new systems, and you will have a smoother migration with better bot detection on the other side.
