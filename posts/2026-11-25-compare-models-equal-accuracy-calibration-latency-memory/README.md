# Compare Models Beyond Accuracy: Calibration, Latency, and Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Machine Learning, Model Versioning, MLOps, Performance

Description: Compare equally accurate models using probability scores, calibration evidence, repeatable latency measurements, and clearly scoped memory observations.

Two models can classify the same percentage of examples correctly while behaving very differently in production. One may assign extreme confidence to its mistakes. Another may meet average latency targets but consume too much memory during loading.

Compare models against the job they must perform. Keep quality, probability behavior, timing, and resource use visible as separate results. Combining everything into one weighted score too early can hide a deployment constraint that no accuracy improvement compensates for.

The examples use **Python 3.11**, **scikit-learn 1.9.1**, **MLflow 3.18.0**, **NumPy 2.4.6**, **pandas 3.1.1**, and **psutil 7.2.0**. The benchmark is limited to synchronous CPU prediction in one Python process.

## Keep the comparison conditions fixed

Use the same held-out examples, labels, preprocessing boundary, and decision threshold. Record model versions and artifact identities, dataset revision, hardware, dependency versions, batch size, and thread settings.

If one model receives cached features while another computes them, you are comparing different workloads. Either include feature preparation for both or report model-only and complete-request measurements separately.

```mermaid
flowchart LR
    A[Same held-out examples] --> B[Labels and probabilities]
    B --> C[Quality and calibration review]
    C --> D[Eligible model versions]
    D --> E[Controlled runtime measurements]
    E --> F[Service load test]
    F --> G[Decision against release requirements]
```

Choose acceptance requirements before inspecting the results. Include important customer or data slices, not just the overall average. A model can maintain total accuracy while moving errors into a small but consequential population.

## Equal accuracy does not mean equal probabilities

Accuracy counts correct class decisions. It discards how confident each decision was. This synthetic example uses a fixed threshold of 0.5 and the positive class label `1`:

```python
import numpy as np
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss

y = np.array([0, 0, 1, 1, 0, 1, 0, 1])
probabilities = {
    'A': np.array([0.1, 0.2, 0.8, 0.9, 0.4, 0.6, 0.7, 0.3]),
    'B': np.array([0.01, 0.01, 0.99, 0.99, 0.01, 0.99, 0.99, 0.01]),
}
for name, positive_probability in probabilities.items():
    scores = {
        'accuracy': accuracy_score(y, positive_probability >= 0.5),
        'brier': brier_score_loss(y, positive_probability, pos_label=1),
        'log_loss': log_loss(
            y, np.column_stack([1 - positive_probability, positive_probability]),
            labels=[0, 1]
        ),
    }
    print(name, {key: round(float(value), 4) for key, value in scores.items()})
```

The tested output is:

| Model | Accuracy | Brier score | Log loss |
|---|---:|---:|---:|
| A | 0.7500 | 0.1750 | 0.5108 |
| B | 0.7500 | 0.2451 | 1.1588 |

Both make six correct decisions out of eight. Model B assigns probabilities close to zero or one, including on its two mistakes. Its worse log loss reflects the cost of confident wrong predictions. Log loss operates on predicted probabilities, not hard class labels. [Log-loss reference](https://scikit-learn.org/1.9/modules/generated/sklearn.metrics.log_loss.html)

Lower Brier score and log loss are better probability scores on the same evaluation set, but they do not isolate calibration alone. They also reflect discrimination: how effectively the model separates outcomes. Do not conclude that a model is better calibrated solely because its Brier score is smaller. [Probability calibration](https://scikit-learn.org/1.9/modules/calibration.html)

Calibration asks whether predicted probabilities agree with observed frequencies. For example, among sufficiently many comparable predictions near 0.8, roughly 80% should be positive. On a substantial held-out set, inspect a reliability diagram and the number of examples in each probability bin. Eight artificial examples are inadequate for a credible calibration study.

If you fit a calibration layer, fit it without using the final evaluation labels. Re-evaluate the resulting complete artifact, since calibration can change latency and memory as well as probabilities. Check behavior around the actual business decision threshold, including false-positive and false-negative costs.

## Measure loading, first prediction, and warm prediction separately

A service that loads slowly can fail during scaling even when steady-state prediction is fast. A first prediction may trigger initialization that later calls avoid. Report those phases separately.

For a small local check, prepare `batch.json` containing a nonempty list of representative input records. Its field names and types must match the model's signature. Configure `MLFLOW_TRACKING_URI`, `MLFLOW_REGISTRY_URI`, and `MODEL_URI` with the environment and fixed numeric model reference being evaluated.

Save this as `benchmark.py`:

```python
import json
import os
import platform
import threading
import time
from pathlib import Path
import mlflow
import numpy as np
import pandas as pd
import psutil

mlflow.set_tracking_uri(os.environ['MLFLOW_TRACKING_URI'])
mlflow.set_registry_uri(os.environ['MLFLOW_REGISTRY_URI'])
model_uri = os.environ['MODEL_URI']
frame = pd.DataFrame(json.loads(Path('batch.json').read_text()))
if frame.empty:
    raise RuntimeError('Supply a nonempty representative batch')
process = psutil.Process()
rss_samples = [process.memory_info().rss]
stop = threading.Event()

def sample_memory():
    while not stop.wait(0.005):
        rss_samples.append(process.memory_info().rss)

sampler = threading.Thread(target=sample_memory, daemon=True)
sampler.start()
try:
    started = time.perf_counter()
    model = mlflow.pyfunc.load_model(model_uri)
    load_seconds = time.perf_counter() - started
    after_load_rss = process.memory_info().rss
    rss_samples.append(after_load_rss)
    started = time.perf_counter()
    model.predict(frame)
    first_batch_ms = (time.perf_counter() - started) * 1000
    for _ in range(20):
        model.predict(frame)
    durations_ms = []
    for _ in range(200):
        started = time.perf_counter()
        model.predict(frame)
        durations_ms.append((time.perf_counter() - started) * 1000)
    rss_samples.append(process.memory_info().rss)
finally:
    stop.set()
    sampler.join()

print(json.dumps({
    'model_uri': model_uri,
    'platform': platform.platform(),
    'python': platform.python_version(),
    'rows_per_batch': len(frame), 'timed_batches': len(durations_ms),
    'load_seconds': load_seconds, 'first_batch_ms': first_batch_ms,
    'warm_batch_p50_ms': float(np.percentile(durations_ms, 50)),
    'warm_batch_p95_ms': float(np.percentile(durations_ms, 95)),
    'before_load_rss_mib': rss_samples[0] / 2**20,
    'after_load_rss_mib': after_load_rss / 2**20,
    'sampled_peak_rss_mib': max(rss_samples) / 2**20,
    'rss_sample_count': len(rss_samples)
}, indent=2))
```

Run `python benchmark.py` in a fresh process for each model and repeat the comparison several times, alternating model order. The script uses `perf_counter`, Python's high-resolution elapsed-time counter. [Python timing reference](https://docs.python.org/3.11/library/time.html#time.perf_counter)

The output separates loading time, the first batch, and 200 timed batches after 20 warm-up calls. The 50th percentile is the median; the 95th percentile indicates a duration exceeded by roughly 5% of these measured calls. These are batch durations, not per-row response times.

A fresh process is not a cold machine. Operating-system file caches and artifact caches may remain warm. Record cache conditions and separately test startup with unavailable caches when that is a deployment requirement. The script does not synchronize asynchronous GPU work and should not be used unchanged to time it.

## Interpret memory numbers within their boundary

Resident set size, or RSS, measures memory resident in physical RAM for the process. `psutil.Process.memory_info().rss` reports bytes; the script converts them to mebibytes, where one MiB is 1,048,576 bytes. [psutil memory API](https://github.com/giampaolo/psutil/blob/release-7.2.0/docs/index.rst)

The report includes RSS before loading, after loading, and the highest observed sample across loading and prediction. These are process-level observations. They include interpreter and library memory, not just model weights.

The background sampler requests observations every five milliseconds, but scheduling can delay it and short-lived allocations can be missed. Its maximum is a sampled lower bound on the true peak, not a guaranteed memory requirement. Sampling also adds measurement overhead.

The script does not account for child workers, GPU memory, or container-wide limits. Validate the real serving topology under realistic concurrency and payload sizes. Adding individual workers' RSS can double-count shared pages, while looking at only the parent can miss most of the workload.

## Move from local measurements to service acceptance

Local validation executed the exact scripts with synthetic probabilities and a small synthetic MLflow model. The timing script completed in two fresh processes, reported 200 batches each time, and rejected an empty batch file. That verifies the measurement path; it is not evidence that any production model meets a latency or memory target.

Next, benchmark the actual serving endpoint at the expected arrival rate and concurrency. Include request parsing, preprocessing, queues, network communication, and output serialization. Report failures and timeouts alongside latency so dropped requests cannot make a model appear faster.

Repeat measurements long enough to expose initialization, periodic work, and memory growth. Compare distributions across runs rather than selecting the fastest run. If quality differences are small, quantify uncertainty using paired evaluation on the same examples; keep related observations together when sampling would otherwise break their dependence.

## Make the release decision explainable

First reject candidates that fail essential quality, latency, or memory constraints. Among eligible candidates, consider whether better probability behavior justifies additional cost for this application.

For a probability-driven decision system, calibration around its operating range may matter more than a small speed gain. For a tightly constrained device, memory can rule out an otherwise strong model. For a batch workflow, sustained throughput and total processing cost may matter more than interactive tail latency.

Save the measurements, conditions, uncertainty, and accepted tradeoffs with the exact model release. Equal accuracy should start this comparison, not end it.
