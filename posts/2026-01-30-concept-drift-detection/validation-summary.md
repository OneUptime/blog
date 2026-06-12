# Validation Summary: How to Implement Concept Drift Detection

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Python
- NumPy
- SciPy statistics APIs
- Concept drift detection
- Page-Hinkley test
- ADWIN adaptive windowing
- Kolmogorov-Smirnov test
- Wasserstein distance
- Population Stability Index
- MLOps monitoring and alerting

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- SciPy `scipy.stats.ttest_ind` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html
- SciPy `scipy.stats.ks_2samp` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html
- SciPy `scipy.stats.wasserstein_distance` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wasserstein_distance.html
- NumPy `numpy.histogram` documentation: https://numpy.org/doc/stable/reference/generated/numpy.histogram.html
- River ADWIN documentation: https://riverml.xyz/dev/api/drift/ADWIN/
- River PageHinkley documentation: https://riverml.xyz/dev/api/drift/PageHinkley/
- arXiv paper page for "Learning under Concept Drift: A Review": https://arxiv.org/abs/2004.05785
- ACM DOI page for "A Survey on Concept Drift Adaptation": https://dl.acm.org/doi/10.1145/2523813
- IEEE Xplore page for "Detecting Concept Drift With Statistical Process Control": https://ieeexplore.ieee.org/document/4053178

## Issues Found
- The performance-based detector populated the reference window with the current detection sample after the detection deque filled, which contaminated the baseline and did not match the comments. Changed `update()` to build the reference baseline first and only then append new errors to the detection window.
- The ADWIN epsilon calculation used an inverted harmonic factor that made the Hoeffding-style threshold far too large for practical detection. Replaced it with a standard harmonic-mean-based Hoeffding-style bound for comparing subwindow means.
- The PSI detector used `np.histogram(..., density=True)` and then normalized the density values as if they were bin proportions. Changed the implementation to use counts, normalize counts to proportions, clip zero bins, and renormalize.
- The PSI detector ignored test values outside the reference min/max bin range. Updated the stored bin edges to include underflow and overflow values with `-np.inf` and `np.inf`.
- The monitoring examples used `datetime.utcnow()`, which returns a naive datetime and is deprecated in modern Python. Replaced it with `datetime.now(timezone.utc)` and updated imports.
- The complete monitoring and metrics snippets referenced typing names that were not imported in those snippets. Added the missing `List`, `Dict`, and `Any` imports where needed.
- The threshold configuration examples had p-value significance levels reversed for sensitive versus conservative monitoring. Updated the examples so high-stakes monitoring uses a more sensitive p-value cutoff and stable batch monitoring uses a stricter cutoff.

## Review Notes
The Python code fences compile syntactically with `python3`. SciPy is not installed in the local environment, so SciPy-specific calls were verified against the official SciPy API documentation rather than executed locally.
