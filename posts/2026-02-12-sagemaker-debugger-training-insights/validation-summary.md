# Validation Summary: How to Use SageMaker Debugger for Training Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SageMaker Debugger
- SageMaker Python SDK
- SMDebug / smdebug
- PyTorch training jobs on SageMaker
- Boto3 SageMaker APIs
- SageMaker Debugger built-in rules and profiler rules

## Sources Consulted
- Amazon SageMaker Debugger overview: https://docs.aws.amazon.com/sagemaker/latest/dg/train-debugger.html
- SageMaker Debugger supported frameworks and algorithms: https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-supported-frameworks.html
- SageMaker Debugger built-in rules: https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-built-in-rules.html
- SageMaker Debugger built-in profiler rules: https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-built-in-profiler-rules.html
- Launch training jobs with Debugger using the SageMaker Python SDK: https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-configuration-for-debugging.html
- Adapt your PyTorch training script for Debugger: https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-modify-script-pytorch.html
- Analyze data using the Debugger Python client library: https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-analyze-data.html
- SageMaker Python SDK Debugger API reference: https://sagemaker.readthedocs.io/en/stable/debugger.html
- AWS SageMaker Python SDK source for Debugger rule configuration imports: https://github.com/aws/sagemaker-python-sdk

## Issues Found
- The profiling example used `Rule.sagemaker(...)` for profiler rules. AWS documents profiler rules as using `ProfilerRule.sagemaker(...)`, so the example was updated to import and use `ProfilerRule`.
- The profiling example used snake_case helper names such as `low_gpu_utilization()`, `cpu_bottleneck()`, `io_bottleneck()`, and `overallsystem_usage()`. The profiler rule configuration package exposes these as `LowGPUUtilization()`, `CPUBottleneck()`, `IOBottleneck()`, and `OverallSystemUsage()`, so the code was corrected.
- The LowGPUUtilization rule parameter was shown as `threshold`. AWS documents this rule parameter as `threshold_p95`, with `threshold_p5` also available, so the code was updated to use `threshold_p95`.
- The profiling example used `FrameworkProfile` with PyTorch 2.0. SageMaker Debugger framework profiling is deprecated starting with PyTorch 2.0, so the profiled estimator example was changed to PyTorch 1.12.0 / Python 3.7 and a note was added.
- The training script snippet referenced `train_loader` and `val_loader` without context. The text now clarifies that the snippet assumes those data loaders have already been created.

## Review Notes
The code snippets are syntactically valid Python. Some tensor names in the analysis examples, such as loss and layer tensor names, are framework- and model-dependent examples rather than universally guaranteed names.
