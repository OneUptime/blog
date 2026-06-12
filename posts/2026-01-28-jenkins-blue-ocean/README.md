# How to Implement Jenkins Blue Ocean

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Blue Ocean, CI/CD, Pipeline, DevOps

Description: Learn how to set up Jenkins Blue Ocean, convert freestyle jobs to pipelines, and visualize builds with the modern UI.

---

Blue Ocean is a visual UI for Jenkins pipelines. It makes pipeline status, logs, and pull request builds easier to understand. Jenkins has announced that Blue Ocean will be deprecated in July 2026, so new installations should also evaluate alternatives such as Pipeline: Stage View and Pipeline Graph View. This guide walks through installation and common workflows.

## Step 1: Install Blue Ocean

In Jenkins:

1. Go to **Manage Jenkins → Plugins**
2. Search for **Blue Ocean**
3. Install and restart Jenkins

## Step 2: Create a Pipeline

Blue Ocean works best with Jenkinsfile-based pipelines.

Example Jenkinsfile:

```groovy
pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'npm ci'
        sh 'npm run build'
      }
    }
    stage('Test') {
      steps {
        sh 'npm test'
      }
    }
  }
}
```

## Step 3: Open Blue Ocean UI

From Jenkins home, click **Open Blue Ocean**. You can:

- View pipeline stages visually
- Inspect logs per step
- Track branch and PR builds

## Step 4: Convert Freestyle Jobs

If you have freestyle jobs, move them to Jenkinsfile pipelines to get full Blue Ocean support.

## Best Practices

- Store Jenkinsfile in Git to version pipeline changes.
- Keep stages short and meaningful.
- Use shared libraries for reusable steps.

## Conclusion

Blue Ocean improves pipeline visibility without changing Jenkins fundamentals. If you already rely on Jenkins and understand its deprecation status, it can make pipelines easier to operate and troubleshoot.
