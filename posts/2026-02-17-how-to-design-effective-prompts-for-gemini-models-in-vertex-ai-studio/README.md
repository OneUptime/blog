# How to Design Effective Prompts for Gemini Models in Vertex AI Studio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Prompt Engineering, Generative AI

Description: A practical guide to designing effective prompts for Gemini models in Vertex AI Studio with techniques, examples, and best practices.

---

The quality of the response you get from a large language model depends heavily on how you ask the question. A vague prompt gets a vague answer. A well-structured prompt with clear instructions, context, and examples gets a precise, useful response. This is prompt engineering, and getting good at it is one of the highest-leverage skills for working with generative AI.

Vertex AI Studio provides an interactive environment for testing and refining prompts before putting them into production. In this guide, I will walk through the techniques that consistently produce better results.

## Getting Started with Vertex AI Studio

Vertex AI Studio is accessible from the Google Cloud Console. Navigate to Vertex AI and select "Generative AI Studio" from the left menu. You will find options for text, chat, and multimodal prompts, each with controls for model selection, temperature, and other generation parameters.

You can also work programmatically, which is what we will focus on here:

```python
# setup.py
# Initialize Vertex AI for prompt testing

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')
```

## Technique 1: Be Specific and Explicit

The most common prompting mistake is being too vague. Compare these two prompts:

Bad prompt:
```
Tell me about Kubernetes.
```

Good prompt:
```
Explain how Kubernetes horizontal pod autoscaling works. Include the default metrics it uses,
how to configure custom metrics, and a YAML example of an HPA resource targeting 70% CPU utilization
for a deployment called "web-app" with min 2 and max 10 replicas.
```

```python
# specific_prompt.py
# Demonstrate the impact of specificity

model = GenerativeModel('gemini-1.5-pro')

# Vague prompt
vague_response = model.generate_content('Tell me about load balancing on GCP.')

# Specific prompt
specific_response = model.generate_content(
    """Explain the differences between the three types of Google Cloud load balancers:
    HTTP(S) Load Balancer, TCP/SSL Proxy Load Balancer, and Network Load Balancer.

    For each type, provide:
    1. Primary use case
    2. Layer of the OSI model it operates at
    3. Whether it supports global or regional load balancing
    4. A one-sentence recommendation for when to use it

    Format as a comparison table."""
)

print(specific_response.text)
```

## Technique 2: Use System Instructions

System instructions set the model's persona and behavior for the entire conversation:

```python
# system_instructions.py
# Use system instructions to shape responses

model = GenerativeModel(
    'gemini-1.5-pro',
    system_instruction=[
        'You are a senior site reliability engineer at a large tech company.',
        'You have deep expertise in Google Cloud Platform, Kubernetes, and Terraform.',
        'Always provide actionable advice with concrete examples.',
        'When suggesting solutions, consider cost, complexity, and team skill level.',
        'Use bullet points for lists. Keep explanations concise.',
        'If a question is ambiguous, ask for clarification rather than guessing.',
    ],
)

response = model.generate_content(
    'We are seeing intermittent 502 errors on our GKE-hosted API. What should we investigate?'
)

print(response.text)
```

## Technique 3: Few-Shot Prompting

Show the model examples of what you want. This is one of the most effective techniques:

```python
# few_shot.py
# Use examples to guide the model's output format and style

prompt = """Convert the following infrastructure descriptions into Terraform resource blocks.

Example 1:
Description: A GCS bucket named "data-lake" in US multi-region with standard storage class
Terraform:
```hcl
resource "google_storage_bucket" "data_lake" {
  name          = "data-lake"
  location      = "US"
  storage_class = "STANDARD"
}
```

Example 2:
Description: A Cloud SQL PostgreSQL 14 instance named "app-db" with 4 vCPUs and 16 GB RAM in us-central1
Terraform:
```hcl
resource "google_sql_database_instance" "app_db" {
  name             = "app-db"
  database_version = "POSTGRES_14"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"
  }
}
```

Now convert this:
Description: A VPC network named "production-vpc" with auto-create subnetworks disabled, and a subnet named "app-subnet" in us-central1 with CIDR range 10.0.0.0/24
Terraform:"""

response = model.generate_content(prompt)
print(response.text)
```

## Technique 4: Chain of Thought

Ask the model to think through a problem step by step:

```python
# chain_of_thought.py
# Use step-by-step reasoning for complex problems

prompt = """I need to design a disaster recovery strategy for our application on GCP.

Current setup:
- Application runs on GKE in us-central1
- Database is Cloud SQL PostgreSQL in us-central1
- Static assets in a GCS bucket
- Daily traffic: 50,000 requests per hour
- RPO requirement: 1 hour (max 1 hour of data loss)
- RTO requirement: 15 minutes (back online within 15 minutes)

Think through this step by step:
1. First, identify the components that need DR coverage
2. Then, for each component, evaluate the available GCP DR options
3. Consider the RPO and RTO requirements when choosing strategies
4. Finally, recommend a specific DR architecture with estimated costs"""

config = GenerationConfig(
    temperature=0.3,  # Lower temperature for analytical tasks
    max_output_tokens=2048,
)

response = model.generate_content(prompt, generation_config=config)
print(response.text)
```

## Technique 5: Output Format Control

Tell the model exactly how to format its response:

```python
# output_format.py
# Control the output format precisely

# JSON output
json_prompt = """Analyze the following GCP service and return a JSON object with this exact schema:
{
  "service_name": "string",
  "category": "string (compute, storage, networking, database, or ai_ml)",
  "pricing_model": "string (per_hour, per_request, per_gb, or free_tier)",
  "best_for": ["string array of use cases"],
  "alternatives": ["string array of competing GCP services"],
  "key_limits": {"limit_name": "limit_value"}
}

Service: Cloud Run

Return only the JSON object, no additional text."""

response = model.generate_content(json_prompt)
print(response.text)
```

```python
# Markdown table output
table_prompt = """Create a comparison table of GCP compute options for running containers.

Include these options: Cloud Run, GKE Autopilot, GKE Standard, Compute Engine with containers

Columns: Service | Min Scale | Max Scale | GPU Support | Pricing Model | Best For

Format as a Markdown table."""

response = model.generate_content(table_prompt)
print(response.text)
```

## Technique 6: Role-Based Prompting

Assign a specific role to get domain-specific responses:

```python
# role_based.py
# Assign roles for different perspectives

# Security review
security_prompt = """You are a cloud security auditor performing a security review.

Review this GKE cluster configuration and identify security issues:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      privileged: true
    ports:
    - containerPort: 8080
    env:
    - name: DB_PASSWORD
      value: "supersecret123"
```

For each issue found:
1. Describe the vulnerability
2. Explain the risk level (critical, high, medium, low)
3. Provide the corrected configuration"""

response = model.generate_content(security_prompt)
print(response.text)
```

## Technique 7: Iterative Refinement

Refine your prompt based on the model's responses. Here is a practical approach:

```python
# iterative_refinement.py
# Test and refine prompts systematically

def test_prompt(prompt, num_runs=3):
    """Test a prompt multiple times to check consistency."""
    responses = []
    for i in range(num_runs):
        config = GenerationConfig(temperature=0.7)
        response = model.generate_content(prompt, generation_config=config)
        responses.append(response.text)
        print(f"\n--- Run {i + 1} ---")
        print(response.text[:500])

    return responses

# Version 1 of the prompt
v1 = "Write a runbook for handling a database failover."

# Version 2 - more specific
v2 = """Write a runbook for handling a Cloud SQL PostgreSQL failover.

Structure:
1. Alert Detection (what alerts trigger this runbook)
2. Initial Assessment (steps to verify the issue)
3. Communication (who to notify and templates)
4. Failover Procedure (step-by-step commands)
5. Verification (how to confirm success)
6. Post-Incident (cleanup and review steps)

For each step, include the exact gcloud or SQL commands to run.
Target audience: on-call SRE with basic GCP knowledge."""

# Test both versions
print("=== Version 1 ===")
test_prompt(v1, num_runs=1)

print("\n=== Version 2 ===")
test_prompt(v2, num_runs=1)
```

## Technique 8: Negative Instructions

Tell the model what NOT to do:

```python
# negative_instructions.py
# Use negative instructions to prevent common issues

prompt = """Explain how to set up monitoring for a GKE cluster.

Important:
- Do NOT recommend third-party tools; focus on GCP-native solutions only
- Do NOT include pricing information
- Do NOT suggest deprecated APIs or approaches
- Do NOT use placeholder values; use realistic example values
- Keep the explanation under 500 words"""

response = model.generate_content(prompt)
print(response.text)
```

## Temperature Guidelines

Temperature controls randomness. Here is when to use different values:

```python
# temperature_guide.py
# Different temperatures for different tasks

# Factual/deterministic tasks (temperature 0.0 - 0.3)
config_factual = GenerationConfig(temperature=0.1)
response = model.generate_content(
    'What are the exact steps to enable the Cloud SQL Admin API?',
    generation_config=config_factual,
)

# Balanced tasks (temperature 0.4 - 0.7)
config_balanced = GenerationConfig(temperature=0.5)
response = model.generate_content(
    'Suggest a monitoring strategy for a microservices architecture on GKE.',
    generation_config=config_balanced,
)

# Creative tasks (temperature 0.8 - 1.0)
config_creative = GenerationConfig(temperature=0.9)
response = model.generate_content(
    'Come up with creative names for our new internal developer platform.',
    generation_config=config_creative,
)
```

## Saving and Reusing Prompts

In Vertex AI Studio, you can save prompts for reuse. Programmatically, keep a prompt library:

```python
# prompt_library.py
# Maintain a library of tested prompts

PROMPTS = {
    'incident_analysis': {
        'system_instruction': 'You are an SRE analyzing a production incident.',
        'template': """Analyze this incident:

Alert: {alert_name}
Service: {service_name}
Error Rate: {error_rate}
Duration: {duration}

Provide:
1. Most likely root causes (ranked by probability)
2. Immediate mitigation steps
3. Investigation commands to run
4. Long-term prevention recommendations""",
    },
    'code_review': {
        'system_instruction': 'You are a senior developer reviewing infrastructure code.',
        'template': """Review this {language} code for:
1. Correctness
2. Security vulnerabilities
3. Performance issues
4. Best practice violations

Code:
```{language}
{code}
```""",
    },
}

# Use a prompt from the library
prompt = PROMPTS['incident_analysis']['template'].format(
    alert_name='High Error Rate',
    service_name='payment-api',
    error_rate='15%',
    duration='23 minutes',
)

model_with_system = GenerativeModel(
    'gemini-1.5-pro',
    system_instruction=[PROMPTS['incident_analysis']['system_instruction']],
)
response = model_with_system.generate_content(prompt)
print(response.text)
```

## Wrapping Up

Effective prompt design is the difference between getting mediocre and excellent results from Gemini. The techniques in this guide - specificity, system instructions, few-shot examples, chain of thought, output format control, role-based prompting, and iterative refinement - are your main tools. Start with clear, specific prompts, add examples when you need consistent formatting, and refine based on the responses you get. Vertex AI Studio makes this iteration cycle fast, letting you test and tune prompts before deploying them in your applications.
