# Validation Summary: How to Detect IPv4 Network Anomalies with Scapy and Machine Learning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scapy
- scikit-learn
- Isolation Forest
- pandas
- NumPy
- IPv4 packet capture
- Network anomaly detection

## Sources Consulted
- Scapy Usage Guide: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `sniff()` API reference: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy IPv4 layer API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet.html
- scikit-learn `IsolationForest` API reference: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html
- scikit-learn Outlier and Novelty Detection guide: https://scikit-learn.org/stable/modules/outlier_detection.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html

## Issues Found
- The Step 3 live-detection snippet called `extract_features(pkt)` without defining it or importing the `TCP` and `UDP` layers it depends on. I added the helper function and the missing Scapy imports so the example is runnable as written.
- The post used `model.score_samples()` but interpreted the result with a zero-centered threshold. scikit-learn documents that the zero threshold applies to `decision_function()`, with `decision_function = score_samples - offset_`. I changed the code to use `decision_function()` and updated the result interpretation bullets to match the documented semantics.

## Review Notes
- The Python snippets were syntax-checked locally with Python 3.12.3, and the Scapy feature extraction logic was sanity-checked locally with Scapy 2.7.0.
- A full end-to-end training run was not executed in this environment because `scikit-learn`, `pandas`, and `joblib` were not installed locally.
