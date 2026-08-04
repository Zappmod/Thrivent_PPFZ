---
name: dead-code-analysis
description: Use when the user wants to find dead code, unused variables, unreachable paragraphs, or uncalled programs in a COBOL or PL/I codebase. Triggers on phrases like "find dead code", "identify unused code", "dead code analysis", "what code is never called", or "unused variables".
---

# Dead Code Analysis

Follow these steps to identify dead code across a COBOL or PL/I codebase.

## Step 1 — Clarify Scope

Use `ask_followup_question` to confirm:
- Is this a single program or the full codebase?
- Which dead code categories matter: unused variables, unreachable paragraphs, uncalled programs, or all?
- Should the output be a report saved to disk or an inline summary?

## Step 2 — Gather Program Inventory

Use `get_project_programs` to retrieve the full list of programs in the project.

## Step 3 — Identify Uncalled Programs

Cross-reference the program list against call relationships:
- Use `get_project_resource_usage` with `resourceType: "variable"` and filter by CALL statement types to find which programs are called.
- Programs that appear in the inventory but are never referenced as a call target are candidates for dead programs.
- Use `get_project_statement_types` to confirm the correct statement filter for CALL statements.

## Step 4 — Identify Unreachable Paragraphs

For each program in scope:
- Use `get_paragraphs` (local) or `execute_sql_query` to list all paragraphs defined in the program.
- Use `get_project_resource_usage` with `resourceType: "variable"` filtered to PERFORM/GO TO statement types to find which paragraphs are actually invoked.
- Paragraphs with no PERFORM or GO TO references are unreachable dead code candidates.

## Step 5 — Identify Unused Variables

For each program in scope:
- Use `get_project_variables` to list all variables declared in the program.
- Use `get_project_resource_usage` with `resourceType: "variable"` to find variables that are never read or written outside their declaration.
- Variables with zero usage occurrences are unused dead code candidates.

## Step 6 — Compile Results

Organize findings into three categories:
1. **Uncalled Programs** — programs never invoked by any other program
2. **Unreachable Paragraphs** — paragraphs never PERFORMed or GO TO'd
3. **Unused Variables** — variables declared but never referenced

For each finding, record:
- Program name and location
- Dead code item name
- Line number(s) where it is declared
- Confidence level (certain / probable — note any caveats like dynamic calls)

## Step 7 — Assess Risk

Flag any findings that require caution:
- Programs that could be called dynamically (string-based CALL) — mark as **probable** not **certain**
- Variables used only in COPY members — note copybook dependency
- Entry points that may be called from JCL or external systems

## Step 8 — Produce Report

Save the report to `.bobz/dead-code-analysis/DEAD-CODE-REPORT.md` using `write_file`.

Structure the report as:

```
# Dead Code Analysis Report
Date: <date>
Scope: <programs analyzed>

## Summary
| Category | Count |
|---|---|
| Uncalled Programs | N |
| Unreachable Paragraphs | N |
| Unused Variables | N |

## Uncalled Programs
...

## Unreachable Paragraphs
...

## Unused Variables
...

## Risk Notes
...
```

Summarize key findings inline for the user and point them to the saved report.
