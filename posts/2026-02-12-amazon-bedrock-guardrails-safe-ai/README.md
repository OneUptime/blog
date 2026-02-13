# How to Use Amazon Bedrock Guardrails for Safe AI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, AI Safety, Guardrails

Description: A practical guide to configuring Amazon Bedrock Guardrails for content filtering, topic blocking, PII redaction, and safe AI deployments in production.

---

Deploying AI models in production without safety controls is a recipe for trouble. Users will try to jailbreak your model, sensitive data will leak into responses, and sooner or later someone will screenshot something embarrassing and post it online. Amazon Bedrock Guardrails give you a way to put up boundaries around your AI applications without having to build all that filtering logic yourself.

Guardrails sit between the user and the foundation model. They inspect both the input (what the user sends) and the output (what the model generates), applying rules you define. If something violates a rule, the guardrail blocks it or modifies the response before it reaches the user.

## Core Guardrail Features

Bedrock Guardrails offer several types of protection, and you can mix and match them based on your needs.

**Content filters** block harmful content across categories like hate speech, insults, sexual content, violence, and misconduct. You set the sensitivity for each category - from low to high.

**Denied topics** let you define specific subjects the model should refuse to engage with. If you're building a customer service bot, you probably don't want it giving legal advice or discussing competitors.

**Word filters** block specific words or phrases from appearing in inputs or outputs. Useful for brand protection or compliance requirements.

**Sensitive information filters** detect and redact PII like names, email addresses, phone numbers, and credit card numbers. This one is critical for any application handling customer data.

**Contextual grounding checks** evaluate whether the model's response is grounded in the source material and relevant to the user's question. This helps reduce hallucinations.

## Creating a Guardrail

Let's set up a guardrail that covers the most common safety requirements.

```python
import boto3
import json

bedrock = boto3.client('bedrock', region_name='us-east-1')

# Create a guardrail with multiple protection layers
response = bedrock.create_guardrail(
    name='customer-service-guardrail',
    description='Safety guardrail for customer service chatbot',

    # Block harmful content with configurable sensitivity
    contentPolicyConfig={
        'filtersConfig': [
            {
                'type': 'SEXUAL',
                'inputStrength': 'HIGH',
                'outputStrength': 'HIGH'
            },
            {
                'type': 'HATE',
                'inputStrength': 'HIGH',
                'outputStrength': 'HIGH'
            },
            {
                'type': 'VIOLENCE',
                'inputStrength': 'MEDIUM',
                'outputStrength': 'HIGH'
            },
            {
                'type': 'INSULTS',
                'inputStrength': 'MEDIUM',
                'outputStrength': 'HIGH'
            },
            {
                'type': 'MISCONDUCT',
                'inputStrength': 'HIGH',
                'outputStrength': 'HIGH'
            }
        ]
    },

    # Define topics the model should not discuss
    topicPolicyConfig={
        'topicsConfig': [
            {
                'name': 'legal-advice',
                'definition': 'Providing specific legal advice, legal opinions, or recommending legal actions',
                'examples': [
                    'Should I sue my landlord?',
                    'Is this contract legally binding?'
                ],
                'type': 'DENY'
            },
            {
                'name': 'competitor-discussion',
                'definition': 'Discussing or comparing competitor products and services',
                'examples': [
                    'How does your product compare to CompetitorX?',
                    'Should I switch to CompetitorY?'
                ],
                'type': 'DENY'
            }
        ]
    },

    # Detect and handle PII
    sensitiveInformationPolicyConfig={
        'piiEntitiesConfig': [
            {'type': 'EMAIL', 'action': 'ANONYMIZE'},
            {'type': 'PHONE', 'action': 'ANONYMIZE'},
            {'type': 'NAME', 'action': 'ANONYMIZE'},
            {'type': 'US_SOCIAL_SECURITY_NUMBER', 'action': 'BLOCK'},
            {'type': 'CREDIT_DEBIT_CARD_NUMBER', 'action': 'BLOCK'}
        ],
        'regexesConfig': [
            {
                'name': 'internal-project-code',
                'description': 'Block internal project codes from leaking',
                'pattern': 'PRJ-[A-Z]{2}-\\d{4}',
                'action': 'BLOCK'
            }
        ]
    },

    # Block specific words
    wordPolicyConfig={
        'wordsConfig': [
            {'text': 'confidential internal'},
            {'text': 'not for public release'}
        ],
        'managedWordListsConfig': [
            {'type': 'PROFANITY'}
        ]
    },

    # Custom blocked message
    blockedInputMessaging='I cannot process this request. Please rephrase your question.',
    blockedOutputsMessaging='I cannot provide a response to that. Let me help you with something else.'
)

guardrail_id = response['guardrailId']
print(f"Guardrail created: {guardrail_id}")
```

## Applying the Guardrail to Model Invocations

Once your guardrail is created, you apply it when calling the model. The guardrail evaluates both the input and the output automatically.

```python
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

# Invoke the model with the guardrail attached
response = bedrock_runtime.invoke_model(
    modelId='anthropic.claude-3-sonnet-20240229-v1:0',
    guardrailIdentifier=guardrail_id,
    guardrailVersion='DRAFT',
    body=json.dumps({
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 1024,
        'messages': [
            {
                'role': 'user',
                'content': 'What is your return policy for damaged items?'
            }
        ]
    })
)

result = json.loads(response['body'].read())
print(result['content'][0]['text'])
```

## Handling Guardrail Interventions

When a guardrail blocks something, you need to handle that gracefully in your application. The response includes metadata about what was blocked and why.

```python
def invoke_with_guardrail(user_message, guardrail_id):
    """Invoke a model with guardrail and handle interventions gracefully."""
    try:
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            guardrailIdentifier=guardrail_id,
            guardrailVersion='DRAFT',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1024,
                'messages': [{'role': 'user', 'content': user_message}]
            })
        )

        result = json.loads(response['body'].read())

        # Check if the guardrail intervened
        stop_reason = result.get('stop_reason', '')
        if stop_reason == 'guardrail_intervened':
            print("Guardrail blocked this interaction")
            # Log the event for review
            log_guardrail_event(user_message, result)
            return result['content'][0]['text']  # Returns blocked message

        return result['content'][0]['text']

    except Exception as e:
        print(f"Error: {e}")
        return "Sorry, something went wrong. Please try again."

def log_guardrail_event(user_input, response):
    """Log guardrail interventions for monitoring and review."""
    # Send to your logging system
    print(f"Blocked input: {user_input[:100]}...")
```

## Using the ApplyGuardrail API Independently

You don't have to use guardrails only with model invocations. The `ApplyGuardrail` API lets you run guardrail checks on any text, which is useful for pre-screening user inputs or post-processing outputs from other systems.

```python
# Apply guardrail to arbitrary text without invoking a model
response = bedrock_runtime.apply_guardrail(
    guardrailIdentifier=guardrail_id,
    guardrailVersion='DRAFT',
    source='INPUT',
    content=[
        {
            'text': {
                'text': 'My SSN is 123-45-6789 and I need help with my account.'
            }
        }
    ]
)

# Check the action taken
action = response['action']  # GUARDRAIL_INTERVENED or NONE
print(f"Action: {action}")

# See what was detected
for output in response['outputs']:
    print(f"Filtered text: {output['text']}")

for assessment in response['assessments']:
    if 'sensitiveInformationPolicy' in assessment:
        for pii in assessment['sensitiveInformationPolicy']['piiEntities']:
            print(f"Detected PII: {pii['type']} - Action: {pii['action']}")
```

## Contextual Grounding Checks

One of the more interesting features is contextual grounding. It evaluates whether the model's response is actually based on the source material you provided. This is huge for RAG applications where hallucinations can be a real problem.

```python
# Create a guardrail with contextual grounding
response = bedrock.create_guardrail(
    name='grounding-guardrail',
    description='Guardrail with contextual grounding checks',
    contextualGroundingPolicyConfig={
        'filtersConfig': [
            {
                'type': 'GROUNDING',
                'threshold': 0.7  # How closely the response must match sources
            },
            {
                'type': 'RELEVANCE',
                'threshold': 0.7  # How relevant the response is to the query
            }
        ]
    },
    blockedInputMessaging='Cannot process this.',
    blockedOutputsMessaging='The response did not meet grounding requirements.'
)
```

## Versioning and Updating Guardrails

Guardrails support versioning, so you can iterate on your safety rules without breaking production. Always create a new version before making changes to a production guardrail.

```python
# Create a versioned snapshot of your current guardrail config
version_response = bedrock.create_guardrail_version(
    guardrailIdentifier=guardrail_id,
    description='v1 - initial production release'
)

version = version_response['version']
print(f"Created version: {version}")

# Now update the DRAFT for testing new rules
bedrock.update_guardrail(
    guardrailIdentifier=guardrail_id,
    name='customer-service-guardrail',
    description='Updated with stricter violence filters',
    contentPolicyConfig={
        'filtersConfig': [
            {'type': 'VIOLENCE', 'inputStrength': 'HIGH', 'outputStrength': 'HIGH'},
            # ... other filters
        ]
    },
    blockedInputMessaging='Request blocked.',
    blockedOutputsMessaging='Response blocked.'
)
```

## Monitoring Guardrail Activity

Keeping track of how often your guardrails fire is essential. It helps you tune sensitivity levels and spot abuse patterns. Bedrock publishes guardrail metrics to CloudWatch, so you can build dashboards and set up alerts.

For a complete monitoring setup across your AI services, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view) - it pairs well with guardrail monitoring.

## Practical Recommendations

Start with strict filters and loosen them based on data. It's much safer to start tight and relax rules than to start loose and tighten up after an incident.

Test your guardrails with adversarial inputs. Try prompt injections, topic circumventions, and edge cases. The Bedrock console has a testing playground that makes this easy.

Log every guardrail intervention. These logs are gold for understanding user behavior and improving your AI application over time.

Don't rely on guardrails alone. They're one layer of defense. Combine them with input validation, rate limiting, and human review for high-stakes actions. Building AI applications that you can trust in production requires multiple overlapping safety measures.
