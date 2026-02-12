# How to Use SageMaker Debugger for Training Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Machine Learning, Debugging, Model Training

Description: Use Amazon SageMaker Debugger to gain real-time insights into model training, detect issues like vanishing gradients, and optimize resource utilization.

---

Training ML models is often a black box. You kick off a job, wait for it to finish, and look at the final metrics. If something went wrong - maybe the loss plateaued early, or the model started overfitting at epoch 30 - you only find out at the end. SageMaker Debugger changes that by giving you real-time visibility into what's happening during training.

Debugger can catch common training problems automatically, profile system resource usage, and emit tensors (weights, gradients, activations) for detailed analysis. Let's see how to use it.

## What Debugger Can Do

Debugger has three main capabilities:

1. **Built-in rules** - Automatically detect training issues like vanishing gradients, overfitting, loss not decreasing, and more
2. **Profiling** - Monitor CPU, GPU, memory, and I/O utilization to find bottlenecks
3. **Tensor emission** - Save intermediate training data (gradients, weights, outputs) for custom analysis

You can use any or all of these features depending on what you need.

## Setting Up Built-In Rules

The easiest way to use Debugger is with its built-in rules. These run alongside your training job and fire alerts when they detect problems.

```python
import sagemaker
from sagemaker.debugger import Rule, rule_configs, DebuggerHookConfig, CollectionConfig

session = sagemaker.Session()
role = sagemaker.get_execution_role()
bucket = session.default_bucket()

# Define built-in rules to monitor during training
rules = [
    # Detect when loss stops decreasing
    Rule.sagemaker(
        rule_configs.loss_not_decreasing(),
        rule_parameters={
            'collection_names': 'losses',
            'num_steps': 10,  # Check over 10 steps
            'diff_percent': 0.1  # Alert if change < 0.1%
        }
    ),

    # Detect overfitting (training loss decreasing but validation loss increasing)
    Rule.sagemaker(
        rule_configs.overfit(),
        rule_parameters={
            'patience': 5,  # Wait 5 steps before flagging
            'ratio_threshold': 0.1
        }
    ),

    # Detect vanishing gradients
    Rule.sagemaker(
        rule_configs.vanishing_gradient(),
        rule_parameters={
            'threshold': 0.0000001  # Gradient magnitude threshold
        }
    ),

    # Detect exploding tensor values
    Rule.sagemaker(
        rule_configs.exploding_tensor(),
        rule_parameters={
            'collection_names': 'weights,gradients',
            'only_nan': False
        }
    ),

    # Monitor weight initialization
    Rule.sagemaker(rule_configs.weight_update_ratio())
]
```

## Training with Debugger Enabled

Attach the rules to your training estimator.

```python
from sagemaker.pytorch import PyTorch

# Configure what tensors to capture
debugger_hook_config = DebuggerHookConfig(
    s3_output_path=f's3://{bucket}/debugger-output',
    collection_configs=[
        CollectionConfig(
            name='losses',
            parameters={
                'save_interval': '10'  # Save every 10 steps
            }
        ),
        CollectionConfig(
            name='weights',
            parameters={
                'save_interval': '100'  # Save every 100 steps
            }
        ),
        CollectionConfig(
            name='gradients',
            parameters={
                'save_interval': '100'
            }
        )
    ]
)

# Create the estimator with Debugger configuration
estimator = PyTorch(
    entry_point='train.py',
    source_dir='./scripts',
    role=role,
    instance_count=1,
    instance_type='ml.p3.2xlarge',
    framework_version='2.0',
    py_version='py310',
    debugger_hook_config=debugger_hook_config,
    rules=rules,
    hyperparameters={
        'epochs': 50,
        'batch_size': 64,
        'learning_rate': 0.001
    }
)

# Start training - Debugger runs in parallel
estimator.fit({
    'train': f's3://{bucket}/data/train',
    'validation': f's3://{bucket}/data/validation'
})
```

## Modifying Your Training Script for Debugger

To emit custom tensors from your training script, use the `smdebug` library. This is pre-installed in SageMaker's framework containers.

```python
# train.py - Training script with Debugger hooks

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import smdebug.pytorch as smd

def train(args):
    # Create the model
    model = nn.Sequential(
        nn.Linear(args.input_dim, 256),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, 128),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(128, 1),
        nn.Sigmoid()
    )

    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=args.learning_rate)

    # Create the Debugger hook - it reads config from environment variables
    hook = smd.Hook.create_from_json_file()

    # Register the hook with the model (captures weights and gradients)
    hook.register_module(model)

    # Register the loss function (captures loss values)
    hook.register_loss(criterion)

    for epoch in range(args.epochs):
        model.train()
        # Set the training mode on the hook
        hook.set_mode(smd.modes.TRAIN)

        running_loss = 0.0
        for batch_idx, (data, target) in enumerate(train_loader):
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output.squeeze(), target.float())
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        # Switch to evaluation mode
        model.eval()
        hook.set_mode(smd.modes.EVAL)

        val_loss = 0.0
        with torch.no_grad():
            for data, target in val_loader:
                output = model(data)
                val_loss += criterion(output.squeeze(), target.float()).item()

        avg_train_loss = running_loss / len(train_loader)
        avg_val_loss = val_loss / len(val_loader)

        print(f"Epoch {epoch+1}: train_loss={avg_train_loss:.4f}, val_loss={avg_val_loss:.4f}")

    print("Training complete!")
```

## Checking Rule Status During Training

You don't have to wait for training to finish to check Debugger results. Rules are evaluated in real-time.

```python
import boto3

# Check rule evaluation status while training is running
client = boto3.client('sagemaker')

job_name = estimator.latest_training_job.name
description = client.describe_training_job(TrainingJobName=job_name)

# Each rule runs as a separate processing job
for rule_eval in description.get('DebugRuleEvaluationStatuses', []):
    print(f"Rule: {rule_eval['RuleConfigurationName']}")
    print(f"  Status: {rule_eval['RuleEvaluationStatus']}")
    if 'StatusDetails' in rule_eval:
        print(f"  Details: {rule_eval['StatusDetails']}")
    print()
```

## Profiling System Resources

Debugger can also profile your training instance to identify hardware bottlenecks. This is incredibly useful for optimizing training costs.

```python
from sagemaker.debugger import ProfilerConfig, FrameworkProfile

# Configure system and framework profiling
profiler_config = ProfilerConfig(
    system_monitor_interval_millis=500,  # Sample every 500ms
    framework_profile_params=FrameworkProfile(
        start_step=5,       # Start profiling at step 5
        num_steps=10,       # Profile for 10 steps
        local_path='/opt/ml/output/profiler'
    )
)

# Profiling rules
profiling_rules = [
    # Detect if GPU utilization is low
    Rule.sagemaker(
        rule_configs.low_gpu_utilization(),
        rule_parameters={
            'threshold': 70,  # Alert if GPU utilization < 70%
            'patience': 5
        }
    ),

    # Detect CPU bottlenecks
    Rule.sagemaker(rule_configs.cpu_bottleneck()),

    # Detect I/O bottlenecks
    Rule.sagemaker(rule_configs.io_bottleneck()),

    # Overall training performance recommendations
    Rule.sagemaker(rule_configs.overallsystem_usage())
]

# Create estimator with profiling enabled
profiled_estimator = PyTorch(
    entry_point='train.py',
    source_dir='./scripts',
    role=role,
    instance_count=1,
    instance_type='ml.p3.2xlarge',
    framework_version='2.0',
    py_version='py310',
    profiler_config=profiler_config,
    rules=profiling_rules,
    hyperparameters={
        'epochs': 50,
        'batch_size': 64,
        'learning_rate': 0.001
    }
)
```

## Analyzing Debugger Output

After training completes, dive deeper into the captured tensors.

```python
from smdebug.trials import create_trial

# Create a trial object pointing to the Debugger output
trial = create_trial(f's3://{bucket}/debugger-output/{job_name}/debug-output')

# List available tensor names
print("Available tensors:")
for name in trial.tensor_names()[:20]:
    print(f"  {name}")

# Analyze the loss over time
loss_tensor = trial.tensor('CrossEntropyLoss_output_0')
steps = loss_tensor.steps()

print(f"\nLoss values across {len(steps)} steps:")
for step in steps[::10]:  # Every 10th step
    value = loss_tensor.value(step)
    print(f"  Step {step}: {value:.6f}")
```

You can also check weight distributions to diagnose issues.

```python
import numpy as np

# Check weight statistics for a specific layer
weight_tensor = trial.tensor('gradient/Linear0.weight')

for step in weight_tensor.steps()[-5:]:  # Last 5 steps
    values = weight_tensor.value(step)
    print(f"Step {step}:")
    print(f"  Mean: {np.mean(values):.8f}")
    print(f"  Std:  {np.std(values):.8f}")
    print(f"  Max:  {np.max(np.abs(values)):.8f}")
    print(f"  Min:  {np.min(np.abs(values)):.8f}")
```

## Common Issues Debugger Catches

Here are the most common training problems Debugger can identify:

| Issue | Symptoms | Debugger Rule |
|-------|----------|---------------|
| Vanishing gradients | Gradients approach zero | `vanishing_gradient` |
| Exploding gradients | Gradients blow up to huge values | `exploding_tensor` |
| Loss not decreasing | Training stalls | `loss_not_decreasing` |
| Overfitting | Training improves but validation doesn't | `overfit` |
| Low GPU utilization | GPU sitting idle | `low_gpu_utilization` |
| Class imbalance | Model predicts one class | `class_imbalance` |
| Dead ReLU | Neurons permanently output zero | `dead_relu` |

## Wrapping Up

SageMaker Debugger turns model training from a black box into an observable process. The built-in rules catch common problems automatically, profiling helps you optimize your hardware usage, and tensor emission gives you the raw data for deep analysis. It's especially valuable for long-running training jobs where you don't want to wait hours only to discover something went wrong in the first few minutes. For systematic hyperparameter optimization, pair Debugger with [SageMaker Automatic Model Tuning](https://oneuptime.com/blog/post/sagemaker-automatic-model-tuning-hyperparameter-optimization/view) and [Experiments](https://oneuptime.com/blog/post/sagemaker-experiments-tracking/view) for full visibility into your model development.
