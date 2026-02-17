# How to Use Adaptive Rubrics for Automated LLM Output Evaluation on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, LLM Evaluation, Rubrics, Quality Assurance

Description: Learn how to create and use adaptive rubrics for automated evaluation of LLM outputs on Vertex AI to ensure consistent quality scoring across different tasks.

---

Evaluating LLM outputs consistently is one of the hardest problems in production AI. A response that is "good" for a customer support query might be completely wrong for a technical documentation task. Adaptive rubrics solve this by defining evaluation criteria that adjust based on the task type, providing consistent and meaningful quality scores across different use cases.

In this post, I will show you how to build adaptive rubric-based evaluation on Vertex AI that scales across different task types and quality dimensions.

## What Are Adaptive Rubrics?

A rubric is a scoring guide with defined criteria and quality levels. An adaptive rubric goes further - it adjusts its criteria based on the task being evaluated. For example, a coding task rubric emphasizes correctness and efficiency, while a creative writing task rubric emphasizes engagement and voice.

The evaluation model (the judge) uses the rubric to score outputs consistently, reducing the subjectivity that comes with open-ended quality judgments.

## Defining Your First Rubric

Start with a structured rubric definition that covers multiple quality dimensions.

Here is how to create a basic rubric:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
import json

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Define a rubric for technical documentation evaluation
tech_doc_rubric = {
    "name": "Technical Documentation Quality",
    "dimensions": {
        "accuracy": {
            "description": "Technical correctness of the content",
            "levels": {
                5: "All technical details are correct and precise",
                4: "Mostly correct with minor imprecisions",
                3: "Some inaccuracies that could confuse readers",
                2: "Multiple significant errors",
                1: "Fundamentally incorrect information"
            },
            "weight": 0.35
        },
        "completeness": {
            "description": "How thoroughly the topic is covered",
            "levels": {
                5: "Comprehensive coverage of all relevant aspects",
                4: "Good coverage with minor omissions",
                3: "Covers basics but misses important details",
                2: "Significant gaps in coverage",
                1: "Barely addresses the topic"
            },
            "weight": 0.25
        },
        "clarity": {
            "description": "How clear and understandable the writing is",
            "levels": {
                5: "Crystal clear, easy to follow for target audience",
                4: "Generally clear with minor confusing sections",
                3: "Understandable but requires re-reading",
                2: "Frequently confusing or poorly organized",
                1: "Incomprehensible or extremely poorly written"
            },
            "weight": 0.25
        },
        "actionability": {
            "description": "Whether the reader can take action based on the content",
            "levels": {
                5: "Clear steps, working code examples, ready to implement",
                4: "Good guidance with minor gaps in action steps",
                3: "Some actionable content but missing key details",
                2: "Mostly theoretical with little practical guidance",
                1: "No actionable information"
            },
            "weight": 0.15
        }
    }
}
```

## Building the Rubric Evaluator

Create an evaluator that uses the rubric to score LLM outputs.

```python
class RubricEvaluator:
    """Evaluate LLM outputs using structured rubrics."""

    def __init__(self, model_name="gemini-2.0-flash"):
        self.judge = GenerativeModel(
            model_name,
            system_instruction=(
                "You are an expert evaluator. Score outputs precisely "
                "according to the rubric provided. Be strict and consistent. "
                "Always provide specific evidence for your scores."
            )
        )

    def evaluate(self, rubric, prompt, response):
        """Evaluate a response against a rubric."""
        # Build the evaluation prompt
        rubric_text = self._format_rubric(rubric)

        eval_prompt = f"""Evaluate the following AI response using the rubric below.

## Rubric: {rubric['name']}

{rubric_text}

## Original Prompt
{prompt}

## Response to Evaluate
{response}

## Instructions
Score each dimension from 1-5 according to the rubric levels.
Provide specific evidence from the response for each score.

Respond in JSON format:
{{
    "scores": {{
        "dimension_name": {{
            "score": <1-5>,
            "evidence": "specific examples from the response"
        }}
    }},
    "weighted_total": <weighted average>,
    "overall_assessment": "brief summary"
}}"""

        result = self.judge.generate_content(
            eval_prompt,
            generation_config=GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )

        return json.loads(result.text)

    def _format_rubric(self, rubric):
        """Format a rubric into readable text."""
        text = ""
        for dim_name, dim in rubric["dimensions"].items():
            text += f"\n### {dim_name} (weight: {dim['weight']})\n"
            text += f"{dim['description']}\n"
            for level, desc in sorted(dim["levels"].items(), reverse=True):
                text += f"  {level}: {desc}\n"
        return text

# Usage
evaluator = RubricEvaluator()

result = evaluator.evaluate(
    rubric=tech_doc_rubric,
    prompt="Explain how to set up a CI/CD pipeline with Cloud Build",
    response="Cloud Build is a CI/CD service. You can create a cloudbuild.yaml file..."
)

print(f"Weighted total: {result['weighted_total']}")
for dim, scores in result["scores"].items():
    print(f"  {dim}: {scores['score']}/5 - {scores['evidence'][:80]}...")
```

## Creating Adaptive Rubrics

The adaptive part means different rubrics for different task types. Define a registry of rubrics that matches tasks to appropriate evaluation criteria.

```python
class AdaptiveRubricRegistry:
    """Registry of rubrics that adapts to different task types."""

    def __init__(self):
        self.rubrics = {}
        self._register_defaults()

    def _register_defaults(self):
        """Register default rubrics for common task types."""
        self.rubrics["code_generation"] = {
            "name": "Code Generation Quality",
            "dimensions": {
                "correctness": {
                    "description": "Does the code work correctly?",
                    "levels": {
                        5: "Code runs correctly and handles all edge cases",
                        4: "Code works for main cases, minor edge case issues",
                        3: "Code has bugs but approach is sound",
                        2: "Code has significant bugs",
                        1: "Code does not work at all"
                    },
                    "weight": 0.40
                },
                "efficiency": {
                    "description": "Is the code efficient?",
                    "levels": {
                        5: "Optimal time and space complexity",
                        4: "Good efficiency, minor improvements possible",
                        3: "Acceptable but not optimal",
                        2: "Inefficient with obvious improvements",
                        1: "Extremely inefficient"
                    },
                    "weight": 0.20
                },
                "readability": {
                    "description": "Is the code easy to read and maintain?",
                    "levels": {
                        5: "Clean, well-documented, follows conventions",
                        4: "Readable with minor style issues",
                        3: "Understandable but messy",
                        2: "Hard to follow",
                        1: "Incomprehensible"
                    },
                    "weight": 0.20
                },
                "completeness": {
                    "description": "Does it address the full requirements?",
                    "levels": {
                        5: "All requirements met with tests",
                        4: "All main requirements met",
                        3: "Most requirements met",
                        2: "Missing major requirements",
                        1: "Does not address the task"
                    },
                    "weight": 0.20
                }
            }
        }

        self.rubrics["customer_support"] = {
            "name": "Customer Support Response Quality",
            "dimensions": {
                "helpfulness": {
                    "description": "How helpful is the response?",
                    "levels": {
                        5: "Fully resolves the issue with clear steps",
                        4: "Provides good guidance toward resolution",
                        3: "Partially helpful but missing key info",
                        2: "Minimally helpful",
                        1: "Not helpful at all"
                    },
                    "weight": 0.35
                },
                "empathy": {
                    "description": "Does the response show understanding?",
                    "levels": {
                        5: "Acknowledges frustration, shows genuine care",
                        4: "Polite and understanding",
                        3: "Professional but impersonal",
                        2: "Cold or dismissive tone",
                        1: "Rude or inappropriate"
                    },
                    "weight": 0.20
                },
                "accuracy": {
                    "description": "Is the information provided correct?",
                    "levels": {
                        5: "All information is accurate and current",
                        4: "Mostly accurate",
                        3: "Some inaccuracies",
                        2: "Significant errors",
                        1: "Incorrect information"
                    },
                    "weight": 0.30
                },
                "conciseness": {
                    "description": "Is the response appropriately concise?",
                    "levels": {
                        5: "Perfect length - thorough but not verbose",
                        4: "Slightly too long or short",
                        3: "Noticeably too long or too brief",
                        2: "Much too long or missing important context",
                        1: "Extremely verbose or just a few words"
                    },
                    "weight": 0.15
                }
            }
        }

        self.rubrics["summarization"] = {
            "name": "Summarization Quality",
            "dimensions": {
                "coverage": {
                    "description": "Does it capture all key points?",
                    "levels": {
                        5: "All major points covered proportionally",
                        4: "Most key points captured",
                        3: "Misses some important points",
                        2: "Covers only a fraction of key content",
                        1: "Fails to capture the main ideas"
                    },
                    "weight": 0.35
                },
                "faithfulness": {
                    "description": "Is it faithful to the source?",
                    "levels": {
                        5: "Completely faithful, no fabrication",
                        4: "Faithful with minor interpretation",
                        3: "Mostly faithful, some unsupported claims",
                        2: "Contains significant misrepresentations",
                        1: "Largely unfaithful to the source"
                    },
                    "weight": 0.35
                },
                "conciseness": {
                    "description": "Is it appropriately concise?",
                    "levels": {
                        5: "Maximally concise without losing meaning",
                        4: "Good compression ratio",
                        3: "Could be more concise",
                        2: "Too verbose or too short",
                        1: "Nearly as long as the original or missing essential content"
                    },
                    "weight": 0.30
                }
            }
        }

    def get_rubric(self, task_type):
        """Get the appropriate rubric for a task type."""
        return self.rubrics.get(task_type)

    def register_rubric(self, task_type, rubric):
        """Register a custom rubric."""
        self.rubrics[task_type] = rubric

# Usage
registry = AdaptiveRubricRegistry()
rubric = registry.get_rubric("code_generation")
```

## Running Batch Evaluations

Evaluate a batch of outputs with the adaptive rubric system.

```python
def batch_evaluate(evaluator, registry, test_cases):
    """Evaluate a batch of test cases with adaptive rubrics."""
    results = []

    for case in test_cases:
        task_type = case.get("task_type", "general")
        rubric = registry.get_rubric(task_type)

        if rubric is None:
            print(f"No rubric for task type: {task_type}")
            continue

        score = evaluator.evaluate(
            rubric=rubric,
            prompt=case["prompt"],
            response=case["response"]
        )

        results.append({
            "task_type": task_type,
            "prompt": case["prompt"][:80],
            "weighted_total": score.get("weighted_total", 0),
            "assessment": score.get("overall_assessment", ""),
            "scores": score.get("scores", {})
        })

    return results

# Example batch
test_cases = [
    {
        "task_type": "code_generation",
        "prompt": "Write a function to reverse a linked list",
        "response": "def reverse_list(head):\n    prev = None\n    current = head..."
    },
    {
        "task_type": "customer_support",
        "prompt": "My invoice seems wrong, I was charged twice",
        "response": "I understand your concern about the double charge..."
    },
]

results = batch_evaluate(evaluator, registry, test_cases)
for r in results:
    print(f"[{r['task_type']}] Score: {r['weighted_total']:.2f} - {r['assessment'][:60]}")
```

## Calibrating Rubrics Over Time

Rubrics should evolve based on feedback. Track scores and adjust when evaluations seem miscalibrated.

```python
class RubricCalibrator:
    """Track and calibrate rubric scoring over time."""

    def __init__(self):
        self.score_history = {}

    def record(self, task_type, dimension, score, human_agrees):
        """Record an evaluation result with human feedback."""
        key = f"{task_type}:{dimension}"
        if key not in self.score_history:
            self.score_history[key] = []
        self.score_history[key].append({
            "score": score,
            "human_agrees": human_agrees
        })

    def get_agreement_rate(self, task_type, dimension):
        """Get the human-AI agreement rate for a dimension."""
        key = f"{task_type}:{dimension}"
        history = self.score_history.get(key, [])
        if not history:
            return None
        agreements = sum(1 for h in history if h["human_agrees"])
        return agreements / len(history)

    def report(self):
        """Print calibration report."""
        print("Rubric Calibration Report")
        print("-" * 50)
        for key, history in self.score_history.items():
            agreement = sum(1 for h in history if h["human_agrees"])
            total = len(history)
            rate = agreement / total if total > 0 else 0
            print(f"  {key}: {rate:.0%} agreement ({total} samples)")
```

## Wrapping Up

Adaptive rubrics bring structure and consistency to LLM output evaluation. By defining clear criteria for each task type and using an LLM judge to apply them, you get scalable quality assessment that adapts to your specific use cases. Build a registry of rubrics, run batch evaluations, and calibrate over time with human feedback. Monitor your evaluation pipeline's consistency with tools like OneUptime to ensure your quality gates remain reliable as your application evolves.
