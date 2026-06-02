# Validation Summary: How to Use SageMaker JumpStart for Pre-Trained Models

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SageMaker JumpStart
- SageMaker Python SDK
- JumpStartModel
- JumpStartEstimator
- SageMaker real-time endpoints
- SageMaker serverless inference
- Boto3
- Python

## Sources Consulted
- Amazon SageMaker AI Developer Guide: Use foundation models with the SageMaker Python SDK: https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-use-python-sdk.html
- Amazon SageMaker AI Developer Guide: Deploy publicly available foundation models with JumpStartModel: https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-use-python-sdk-model-class.html
- Amazon SageMaker AI Developer Guide: Model sources and license agreements / EULA acceptance: https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-choose.html
- SageMaker Python SDK documentation: Built-in Algorithms with pre-trained Model Table: https://sagemaker.readthedocs.io/en/v2.243.2/doc_utils/pretrainedmodels.html
- SageMaker Python SDK documentation: JumpStartModel API: https://sagemaker.readthedocs.io/en/stable/api/inference/model.html
- SageMaker Python SDK documentation: JumpStartEstimator API: https://sagemaker.readthedocs.io/en/stable/api/training/estimators.html
- Amazon SageMaker Examples: Llama 2 fine-tuning notebook: https://sagemaker-examples.readthedocs.io/en/latest/introduction_to_amazon_algorithms/jumpstart-foundation-models/llama-2-finetuning.html
- Amazon SageMaker Examples: JumpStart image classification notebook: https://sagemaker-examples.readthedocs.io/en/latest/introduction_to_amazon_algorithms/jumpstart_image_classification/Amazon_JumpStart_Image_Classification.html
- AWS Machine Learning Blog: Text embedding and sentence similarity retrieval at scale with SageMaker JumpStart: https://aws.amazon.com/blogs/machine-learning/text-embedding-and-sentence-similarity-retrieval-at-scale-with-amazon-sagemaker-jumpstart/

## Issues Found
- The sentence-similarity inference example used a `text_inputs` dictionary and expected `response['embedding']`. AWS's JumpStart sentence-similarity example sends a list of sentences and receives embeddings directly, so the snippet now uses JSON serialization/deserialization and treats the prediction result as the embedding list.
- The Llama deployment example omitted explicit EULA acceptance. JumpStart foundation models such as Llama require `accept_eula=True` when deploying with SageMaker Python SDK 2.198.0 or later, so this was added.
- The Llama inference example printed `response[0]['generated_text']`, but the SageMaker Llama 2 example returns generated text under `response[0]['generation']`. The output key was corrected.
- The image-classification example parsed the endpoint response as a label-to-score dictionary. JumpStart image classification returns `labels` and `probabilities` for verbose JSON output, so the snippet now requests `application/json;verbose` and ranks probabilities by index.
- The cleanup example used `boto3` after the image example no longer imported it. Added an explicit `import boto3` in the cleanup snippet.
- The Llama fine-tuning example used `epochs` for the Llama hyperparameter. The official Llama 2 JumpStart fine-tuning example uses `epoch`, so the key was corrected. The estimator also now sets `environment={'accept_eula': 'true'}` for Llama model access.

## Review Notes
- The examples use SageMaker Python SDK 2.x style imports, which remain documented in current AWS and SageMaker SDK 2.x documentation. SageMaker Python SDK v3 also has newer JumpStart training APIs, so a future refresh could explicitly state which SDK major version the post targets.
