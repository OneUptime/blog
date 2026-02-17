# How to Use MetricX and COMET Metrics for Translation Model Evaluation on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, MetricX, COMET, Translation Evaluation

Description: Learn how to use MetricX and COMET metrics on Vertex AI to evaluate machine translation quality beyond simple BLEU scores for more accurate assessments.

---

If you are building a translation pipeline on Google Cloud, you need better evaluation metrics than BLEU. BLEU scores were the standard for years, but they correlate poorly with human judgments of translation quality. MetricX and COMET are neural evaluation metrics that score translations much more like humans do, and Vertex AI supports them natively.

I switched from BLEU to these metrics for a multilingual content pipeline and immediately caught quality issues that BLEU missed. Let me show you how to set them up and use them effectively.

## The Problem with Traditional Metrics

BLEU measures n-gram overlap between a machine translation and a reference translation. It gives you a number between 0 and 1, and for decades, that was all we had. But BLEU has serious limitations. It penalizes valid paraphrases, ignores semantic meaning, and does not account for fluency. A translation can score high on BLEU while being awkward or misleading, and vice versa.

MetricX and COMET are trained neural models that evaluate translations by understanding meaning, not just matching words. They correlate much more closely with human quality judgments.

## Understanding MetricX

MetricX is Google's neural translation evaluation metric. It uses a trained model to score translation quality, taking into account the source text, the translated text, and optionally a reference translation. Lower scores mean better translations (it is a quality estimation model where 0 is perfect).

## Understanding COMET

COMET (Crosslingual Optimized Metric for Evaluation of Translation) is another neural metric that takes source, hypothesis, and reference as inputs. It produces a score where higher is better. COMET has been shown to correlate better with human judgments than BLEU across many language pairs.

## Setting Up the Evaluation Environment

Here is how to get started with translation evaluation on Vertex AI:

```python
import vertexai
from vertexai.evaluation import EvalTask
import pandas as pd

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Prepare your evaluation dataset
# Each row needs the source text, the translation, and optionally a reference
eval_dataset = pd.DataFrame({
    "source": [
        "The weather forecast predicts heavy rain tomorrow afternoon.",
        "Please submit your quarterly report by Friday.",
        "The system detected an anomaly in the network traffic patterns.",
        "Customers can now track their orders in real time.",
        "The board approved the new sustainability initiative.",
    ],
    "response": [
        "Las previsiones meteorologicas predicen lluvias fuertes manana por la tarde.",
        "Por favor, envie su informe trimestral antes del viernes.",
        "El sistema detecto una anomalia en los patrones de trafico de red.",
        "Los clientes ahora pueden rastrear sus pedidos en tiempo real.",
        "La junta aprobo la nueva iniciativa de sostenibilidad.",
    ],
    "reference": [
        "El pronostico del tiempo predice lluvias intensas manana por la tarde.",
        "Por favor, presente su informe trimestral antes del viernes.",
        "El sistema detecto una anomalia en los patrones del trafico de red.",
        "Los clientes ya pueden seguir sus pedidos en tiempo real.",
        "El consejo aprobo la nueva iniciativa de sostenibilidad.",
    ]
})
```

## Running MetricX Evaluation

Use the Vertex AI evaluation framework to run MetricX on your translations.

```python
# Run evaluation with MetricX
eval_task = EvalTask(
    dataset=eval_dataset,
    metrics=["metricx"],
    experiment="translation-eval-metricx-v1"
)

result = eval_task.evaluate()

# Print summary metrics
print("MetricX Summary:")
for metric, value in result.summary_metrics.items():
    print(f"  {metric}: {value:.4f}")

# Print per-example scores
print("\nPer-example MetricX scores:")
for idx, row in result.metrics_table.iterrows():
    source_preview = eval_dataset.iloc[idx]["source"][:50]
    score = row.get("metricx", "N/A")
    print(f"  [{idx}] {source_preview}... -> {score:.4f}")
```

## Running COMET Evaluation

COMET works similarly but with a different scoring direction - higher is better.

```python
# Run evaluation with COMET
eval_task_comet = EvalTask(
    dataset=eval_dataset,
    metrics=["comet"],
    experiment="translation-eval-comet-v1"
)

result_comet = eval_task_comet.evaluate()

# Print COMET results
print("COMET Summary:")
for metric, value in result_comet.summary_metrics.items():
    print(f"  {metric}: {value:.4f}")
```

## Combining Multiple Metrics

For a comprehensive evaluation, run multiple metrics together and compare.

```python
# Run all translation metrics together
comprehensive_eval = EvalTask(
    dataset=eval_dataset,
    metrics=[
        "metricx",
        "comet",
        "bleu",
        "rouge_l_sum",
    ],
    experiment="translation-comprehensive-eval"
)

result_all = comprehensive_eval.evaluate()

# Create a comparison table
comparison = result_all.metrics_table[[
    "metricx", "comet", "bleu", "rouge_l_sum"
]].copy()
comparison.insert(0, "source", eval_dataset["source"].str[:40] + "...")

print("\nMetric Comparison:")
print(comparison.to_string())

# Check correlation between metrics
print("\nMetric Correlations:")
numeric_cols = comparison.select_dtypes(include=["float64", "float32"]).columns
print(comparison[numeric_cols].corr().to_string())
```

## Evaluating Different Translation Models

Use these metrics to compare translation approaches - for example, comparing a fine-tuned model against a general-purpose one.

```python
from vertexai.generative_models import GenerativeModel

def translate_batch(model, texts, target_language):
    """Translate a batch of texts using a Gemini model."""
    translations = []
    for text in texts:
        response = model.generate_content(
            f"Translate the following English text to {target_language}. "
            f"Provide only the translation, no explanations.\n\n{text}"
        )
        translations.append(response.text.strip())
    return translations

# Compare two models
model_flash = GenerativeModel("gemini-2.0-flash")
model_pro = GenerativeModel("gemini-2.0-pro")

sources = eval_dataset["source"].tolist()

# Get translations from both models
flash_translations = translate_batch(model_flash, sources, "Spanish")
pro_translations = translate_batch(model_pro, sources, "Spanish")

# Evaluate Flash translations
flash_dataset = eval_dataset.copy()
flash_dataset["response"] = flash_translations

flash_eval = EvalTask(
    dataset=flash_dataset,
    metrics=["metricx", "comet"],
    experiment="flash-translation-eval"
)
flash_result = flash_eval.evaluate()

# Evaluate Pro translations
pro_dataset = eval_dataset.copy()
pro_dataset["response"] = pro_translations

pro_eval = EvalTask(
    dataset=pro_dataset,
    metrics=["metricx", "comet"],
    experiment="pro-translation-eval"
)
pro_result = pro_eval.evaluate()

# Compare
print("Model Comparison:")
print(f"  Flash - MetricX: {flash_result.summary_metrics.get('metricx/mean', 'N/A'):.4f}, "
      f"COMET: {flash_result.summary_metrics.get('comet/mean', 'N/A'):.4f}")
print(f"  Pro   - MetricX: {pro_result.summary_metrics.get('metricx/mean', 'N/A'):.4f}, "
      f"COMET: {pro_result.summary_metrics.get('comet/mean', 'N/A'):.4f}")
```

## Building a Translation Quality Pipeline

For production translation systems, build an automated quality pipeline.

```python
class TranslationQualityPipeline:
    """Automated quality assessment for translation pipelines."""

    def __init__(self, quality_threshold_metricx=0.5, quality_threshold_comet=0.8):
        # MetricX: lower is better, COMET: higher is better
        self.metricx_threshold = quality_threshold_metricx
        self.comet_threshold = quality_threshold_comet

    def evaluate_batch(self, sources, translations, references=None):
        """Evaluate a batch of translations."""
        data = {
            "source": sources,
            "response": translations,
        }
        if references:
            data["reference"] = references

        dataset = pd.DataFrame(data)

        eval_task = EvalTask(
            dataset=dataset,
            metrics=["metricx", "comet"],
            experiment=f"quality-check-{pd.Timestamp.now().strftime('%Y%m%d%H%M')}"
        )

        result = eval_task.evaluate()
        return self._analyze_results(result, dataset)

    def _analyze_results(self, result, dataset):
        """Analyze evaluation results and flag quality issues."""
        table = result.metrics_table
        issues = []

        for idx, row in table.iterrows():
            metricx_score = row.get("metricx", 0)
            comet_score = row.get("comet", 1)

            # Flag low quality translations
            if metricx_score > self.metricx_threshold or comet_score < self.comet_threshold:
                issues.append({
                    "index": idx,
                    "source": dataset.iloc[idx]["source"],
                    "translation": dataset.iloc[idx]["response"],
                    "metricx": metricx_score,
                    "comet": comet_score,
                    "reason": self._diagnose(metricx_score, comet_score)
                })

        return {
            "total": len(table),
            "passed": len(table) - len(issues),
            "failed": len(issues),
            "pass_rate": (len(table) - len(issues)) / len(table),
            "issues": issues,
            "summary_metrics": dict(result.summary_metrics)
        }

    def _diagnose(self, metricx, comet):
        """Diagnose why a translation failed quality checks."""
        reasons = []
        if metricx > self.metricx_threshold:
            reasons.append(f"MetricX {metricx:.3f} exceeds threshold {self.metricx_threshold}")
        if comet < self.comet_threshold:
            reasons.append(f"COMET {comet:.3f} below threshold {self.comet_threshold}")
        return "; ".join(reasons)

# Usage
pipeline = TranslationQualityPipeline()
results = pipeline.evaluate_batch(
    sources=["Hello, how are you?", "The meeting is at 3 PM."],
    translations=["Hola, como estas?", "La reunion es a las 3 de la tarde."],
    references=["Hola, como te encuentras?", "La reunion es a las 15:00."]
)

print(f"Pass rate: {results['pass_rate']:.0%}")
if results["issues"]:
    print(f"Issues found in {len(results['issues'])} translations")
```

## Language Pair Analysis

Different language pairs have different quality characteristics. Track metrics by language pair.

```python
def evaluate_by_language_pair(translation_data):
    """Evaluate and report quality by language pair."""
    results_by_pair = {}

    for lang_pair, data in translation_data.items():
        dataset = pd.DataFrame(data)

        eval_task = EvalTask(
            dataset=dataset,
            metrics=["metricx", "comet"],
            experiment=f"langpair-{lang_pair}"
        )
        result = eval_task.evaluate()

        results_by_pair[lang_pair] = {
            "metricx_mean": result.summary_metrics.get("metricx/mean", 0),
            "comet_mean": result.summary_metrics.get("comet/mean", 0),
            "sample_count": len(dataset)
        }

    # Print comparison
    print("Quality by Language Pair:")
    print(f"{'Pair':<15} {'MetricX':>10} {'COMET':>10} {'Samples':>10}")
    print("-" * 50)
    for pair, metrics in sorted(results_by_pair.items(),
                                 key=lambda x: x[1]["comet_mean"],
                                 reverse=True):
        print(f"{pair:<15} {metrics['metricx_mean']:>10.4f} "
              f"{metrics['comet_mean']:>10.4f} {metrics['sample_count']:>10}")

    return results_by_pair
```

## Setting Up Continuous Evaluation

Run translation quality checks automatically as part of your pipeline.

```python
def continuous_quality_check(pipeline, translation_service):
    """Run periodic quality checks on a translation service."""
    # Standard test sentences that cover common patterns
    test_sources = [
        "The quarterly revenue exceeded expectations by 15%.",
        "Please restart the application after applying the update.",
        "We sincerely apologize for any inconvenience caused.",
        "The new feature will be available to all users next week.",
        "For security reasons, please change your password immediately.",
    ]

    # Get fresh translations
    translations = [
        translation_service.translate(s, target="es")
        for s in test_sources
    ]

    # Evaluate
    results = pipeline.evaluate_batch(
        sources=test_sources,
        translations=translations
    )

    # Alert if quality drops
    if results["pass_rate"] < 0.8:
        print(f"ALERT: Translation quality below threshold. "
              f"Pass rate: {results['pass_rate']:.0%}")
        for issue in results["issues"]:
            print(f"  Issue: {issue['source'][:50]}... - {issue['reason']}")

    return results
```

## Wrapping Up

MetricX and COMET provide much more accurate translation quality assessment than traditional metrics like BLEU. They catch subtle quality issues that n-gram overlap metrics miss, and they correlate much better with human judgments. Set up automated quality pipelines that use these metrics, track quality by language pair, and run continuous checks to catch regressions. Monitor your translation quality over time with tools like OneUptime to ensure consistent quality across all your supported languages.
