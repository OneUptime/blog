# How to Build a Code Execution Pipeline with Gemini Built-In Code Interpreter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Code Interpreter, Code Execution

Description: Learn how to use Gemini's built-in code interpreter to build code execution pipelines for data analysis, calculations, and automated scripting on Vertex AI.

---

One of the most interesting features in Gemini is the built-in code interpreter. Instead of just generating code as text, Gemini can actually execute Python code in a sandboxed environment and return the results. This bridges the gap between "here is some code that should work" and "here is the actual answer computed from running the code."

I have been using this feature for data analysis workflows, automated calculations, and building pipelines that need verified computational results. Let me show you how it works and how to build real applications with it.

## What Is the Code Interpreter?

The code interpreter is a tool built into Gemini that gives the model access to a sandboxed Python environment. When the model determines it needs to compute something - math, data transformations, chart generation - it writes Python code, executes it, and uses the output to form its response.

The sandbox includes common libraries like NumPy, Pandas, and Matplotlib. The model can iterate on its code if the first attempt produces errors, making it surprisingly robust for computational tasks.

## Enabling the Code Interpreter

To use the code interpreter, you add it as a tool when creating the model.

This code enables the code interpreter:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Tool

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

# Create the code execution tool
code_interpreter_tool = Tool.from_code_execution()

# Create a model with code execution enabled
model = GenerativeModel(
    "gemini-2.0-flash",
    tools=[code_interpreter_tool]
)

# Ask a question that benefits from computation
response = model.generate_content(
    "Calculate the compound interest on a $10,000 investment "
    "at 7.5% annual rate compounded monthly over 15 years."
)

print(response.text)
```

## Inspecting Executed Code

When the model uses the code interpreter, the response includes both the code that was executed and its output. This transparency is valuable for debugging and verification.

Here is how to extract the executed code:

```python
# Generate a response that involves computation
response = model.generate_content(
    "Generate the first 20 prime numbers and calculate their sum."
)

# Inspect all parts of the response
for part in response.candidates[0].content.parts:
    if part.text:
        print(f"Text: {part.text}")
    if part.executable_code:
        print(f"\nExecuted code:\n{part.executable_code.code}")
    if part.code_execution_result:
        print(f"\nExecution output:\n{part.code_execution_result.output}")
```

## Building a Data Analysis Pipeline

The code interpreter excels at data analysis. You can send CSV data as text and let Gemini write and execute analysis code.

This example analyzes sales data:

```python
# Provide data and ask for analysis
sales_data = """date,product,quantity,revenue
2025-01-01,Widget A,150,4500
2025-01-01,Widget B,200,8000
2025-01-02,Widget A,175,5250
2025-01-02,Widget B,180,7200
2025-01-03,Widget A,160,4800
2025-01-03,Widget B,220,8800
2025-01-04,Widget A,190,5700
2025-01-04,Widget B,195,7800
2025-01-05,Widget A,145,4350
2025-01-05,Widget B,210,8400"""

response = model.generate_content(f"""Analyze this sales data:

{sales_data}

Please:
1. Calculate total revenue per product
2. Find the average daily quantity for each product
3. Identify which product has better revenue per unit
4. Calculate the day-over-day growth rate for each product
""")

print(response.text)
```

## Handling Complex Calculations

For multi-step calculations that would be error-prone with text generation alone, the code interpreter gives you verified results.

```python
# Complex financial calculation
response = model.generate_content("""
I have a loan with these terms:
- Principal: $350,000
- Annual interest rate: 6.25%
- Loan term: 30 years
- Monthly payments

Calculate:
1. Monthly payment amount
2. Total interest paid over the life of the loan
3. Amortization schedule for the first 12 months (show month, payment, principal portion, interest portion, remaining balance)
4. How much would I save if I made an extra $200 payment each month?
""")

print(response.text)
```

## Building a Chart Generation Pipeline

The code interpreter can create matplotlib charts. The generated images are returned as part of the response.

```python
# Ask for a chart to be generated
response = model.generate_content("""
Using this monthly revenue data, create a line chart:

Month, Revenue
Jan, 45000
Feb, 48000
Mar, 52000
Apr, 49000
May, 55000
Jun, 61000
Jul, 58000
Aug, 63000
Sep, 67000
Oct, 72000
Nov, 69000
Dec, 78000

Make the chart professional with:
- Title: "Monthly Revenue 2025"
- Y-axis label: "Revenue ($)"
- X-axis label: "Month"
- A trend line
- Grid lines
""")

# Extract the generated image
for part in response.candidates[0].content.parts:
    if part.inline_data:
        # Save the generated chart
        with open("revenue_chart.png", "wb") as f:
            f.write(part.inline_data.data)
        print("Chart saved as revenue_chart.png")
    if part.text:
        print(part.text)
```

## Chat-Based Code Execution

The code interpreter works in chat sessions too, allowing iterative analysis where each step builds on the previous one.

```python
# Interactive data analysis session
chat = model.start_chat()

# Step 1: Load and explore data
response = chat.send_message("""
Here is a dataset of server response times (in milliseconds):

server,avg_response,p99_response,error_rate
web-01,45,120,0.02
web-02,52,180,0.05
web-03,38,95,0.01
web-04,67,250,0.08
web-05,41,110,0.015
api-01,78,320,0.03
api-02,85,400,0.06
api-03,72,290,0.025

Load this data and give me basic statistics.
""")
print(response.text)

# Step 2: Deeper analysis
response = chat.send_message(
    "Which servers have error rates above 3%? "
    "And is there a correlation between response time and error rate?"
)
print(response.text)

# Step 3: Recommendations
response = chat.send_message(
    "Based on this analysis, which servers need attention? "
    "Calculate how much the overall error rate would drop if we fixed "
    "the worst-performing server."
)
print(response.text)
```

## Error Handling in Code Execution

The code interpreter can retry when code fails, but you should still handle cases where execution does not produce the expected results.

```python
def execute_with_validation(model, prompt, expected_output_type="text"):
    """Execute a code-interpreted prompt with validation."""
    response = model.generate_content(prompt)

    result = {
        "text": "",
        "code_executed": [],
        "code_outputs": [],
        "images": [],
        "success": True
    }

    for part in response.candidates[0].content.parts:
        if part.text:
            result["text"] += part.text
        if part.executable_code:
            result["code_executed"].append(part.executable_code.code)
        if part.code_execution_result:
            output = part.code_execution_result.output
            result["code_outputs"].append(output)
            # Check for execution errors
            if "Error" in output or "Traceback" in output:
                result["success"] = False
        if part.inline_data:
            result["images"].append(part.inline_data.data)

    # Validate we got the expected type of output
    if expected_output_type == "image" and not result["images"]:
        result["success"] = False
    elif expected_output_type == "text" and not result["text"]:
        result["success"] = False

    return result

# Usage
result = execute_with_validation(
    model,
    "Calculate the standard deviation of [23, 45, 12, 67, 34, 89, 56]"
)

if result["success"]:
    print(f"Result: {result['text']}")
    if result["code_executed"]:
        print(f"Code used: {result['code_executed'][0]}")
else:
    print("Execution failed. Retrying with explicit instructions...")
```

## Building an Automated Report Generator

Combine code execution with Gemini's text generation to create automated reports.

```python
def generate_analysis_report(data_csv, report_title):
    """Generate a complete analysis report with charts and statistics."""
    chat = model.start_chat()

    # Step 1: Statistical analysis
    stats_response = chat.send_message(f"""
Analyze this data and compute key statistics:

{data_csv}

Calculate mean, median, standard deviation, and quartiles for all numeric columns.
Identify any outliers using the IQR method.
""")

    # Step 2: Generate visualizations
    chart_response = chat.send_message(
        "Create appropriate charts for this data. "
        "Include a histogram for distribution and a box plot for outliers."
    )

    # Step 3: Generate insights
    insights_response = chat.send_message(
        "Based on the statistics and visualizations, "
        "write 3-5 key insights about this data. "
        "Include specific numbers to support each insight."
    )

    # Compile the report
    report = f"# {report_title}\n\n"
    report += "## Statistical Summary\n" + stats_response.text + "\n\n"
    report += "## Key Insights\n" + insights_response.text + "\n"

    return report

# Generate a report
report = generate_analysis_report(
    data_csv="timestamp,cpu,memory,requests\n...",
    report_title="Server Performance Report - January 2026"
)
print(report)
```

## Wrapping Up

Gemini's code interpreter turns the model into a computational partner. Instead of generating code and hoping it works, you get verified results from actual execution. This is valuable for data analysis, financial calculations, chart generation, and any workflow where accuracy matters more than speed. Start with simple calculations, build up to multi-step analysis pipelines, and integrate code execution into your automated reporting workflows. Track execution success rates and latency with tools like OneUptime to keep your pipelines running smoothly.
