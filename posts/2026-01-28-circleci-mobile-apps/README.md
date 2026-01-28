# How to Use CircleCI for Mobile Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CircleCI, Mobile Apps, CI/CD, iOS, Android

Description: Learn how to build and test iOS and Android apps in CircleCI, manage signing, and speed up mobile pipelines.

---

CircleCI supports both Android and iOS builds. With proper caching and secrets management, you can run reliable mobile pipelines.

## Android Pipeline

```yaml
version: 2.1

jobs:
  android:
    docker:
      - image: cimg/android:2023.10
    steps:
      - checkout
      - run: ./gradlew test
      - run: ./gradlew assembleRelease

workflows:
  mobile:
    jobs:
      - android
```

## iOS Pipeline

```yaml
version: 2.1

jobs:
  ios:
    macos:
      xcode: "15.0.1"
    steps:
      - checkout
      - run: xcodebuild -scheme MyApp -sdk iphonesimulator -configuration Debug build

workflows:
  mobile:
    jobs:
      - ios
```

## Code Signing

- Store certificates and provisioning profiles in environment variables or secure storage
- Use `fastlane` for automated signing and distribution

## Caching

Cache Gradle and CocoaPods for faster builds.

## Best Practices

- Separate test and release workflows
- Run UI tests on demand
- Pin Xcode versions for consistency

## Conclusion

CircleCI works well for mobile CI when you manage caches, secrets, and platform-specific requirements. Start with basic builds and expand to distribution once stable.
