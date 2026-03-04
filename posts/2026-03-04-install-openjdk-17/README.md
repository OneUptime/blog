# How to Install OpenJDK 17 on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Java, OpenJDK, Linux

Description: Learn how to install OpenJDK 17 on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

OpenJDK 17 is a long-term support (LTS) release of the Java Development Kit available in the RHEL 9 AppStream repository. It provides the Java runtime and development tools needed to run and build Java applications.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Install OpenJDK 17

For just the runtime (JRE):

```bash
sudo dnf install -y java-17-openjdk
```

For development (JDK):

```bash
sudo dnf install -y java-17-openjdk-devel
```

## Step 2: Verify Installation

```bash
java -version
javac -version
```

Expected output:

```bash
openjdk version "17.0.x" 2024-xx-xx
OpenJDK Runtime Environment (Red_Hat-17.0.x) (build 17.0.x+x)
OpenJDK 64-Bit Server VM (Red_Hat-17.0.x) (build 17.0.x+x, mixed mode, sharing)
```

## Step 3: Set JAVA_HOME

```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Step 4: Switch Between Java Versions

If multiple Java versions are installed:

```bash
sudo alternatives --config java
```

This shows a list of installed Java versions and lets you select the default.

## Step 5: Test with a Simple Program

```bash
cat > Hello.java << 'EOF'
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello from OpenJDK " + System.getProperty("java.version"));
    }
}
EOF

javac Hello.java
java Hello
```

## Conclusion

OpenJDK 17 on RHEL 9 provides a production-ready Java platform with long-term support. It is included in the base RHEL repositories and receives regular security updates through the standard RHEL update process.
