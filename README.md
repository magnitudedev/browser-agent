<div align="center">
  <img src="assets/banner.png" alt="Magnitude Text Logo"/>
</div>

<br/>

<div align="center">
  <a href="https://docs.magnitude.run/getting-started/introduction" target="_blank"><img src="https://img.shields.io/badge/📕-Docs-0369a1?style=flat-square&labelColor=0369a1&color=gray" alt="Documentation" /></a> <img src="https://img.shields.io/badge/License-Apache%202.0-0369a1?style=flat-square&labelColor=0369a1&color=gray" alt="License" /> <a href="https://discord.gg/VcdpMh9tTy" target="_blank"><img src="https://img.shields.io/discord/1305570963206836295?style=flat-square&logo=discord&logoColor=white&label=Discord&labelColor=5865F2&color=gray" alt="Discord" /></a> <a href="https://x.com/tgrnwld" target="_blank"><img src="https://img.shields.io/badge/-Follow%20Tom!-000000?style=flat-square&labelColor=000000&color=gray&logo=x&logoColor=white" alt="Follow Tom" /></a> <a href="https://x.com/ndrsrkl" target="_blank"><img src="https://img.shields.io/badge/-Follow%20Anders!-000000?style=flat-square&labelColor=000000&color=gray&logo=x&logoColor=white" alt="Follow Anders" /></a>
</div>

<hr/>

> 🚀 New: Magnitude is state-of-the-art, scoring [94% on WebVoyager](https://github.com/magnitudedev/webvoyager)!

Magnitude uses vision AI to enable you to control your browser with natural language.
- 🧭 **Navigate** - Sees and understands any interface to plan out actions
- 🖱️ **Interact** - Executes precise actions using mouse and keyboard
- 🔍 **Extract** - Intelligently extracts useful structured data
- ✅ **Verify** - Built-in test runner with powerful visual assertions

You can use it to automate tasks on the web, integrate between apps without APIs, extract data, test your web apps, or as a building block for your own browser agents.

![Video showing Magnitude tests running in a terminal and agent taking actions in the browser](assets/readme.gif)

↕️ Magnitude in action! ↕️
```ts
// Magnitude can handle high-level tasks
await agent.act('Create a task', {
    // Optionally pass data that the agent will use where appropriate
    data: {
        title: 'Use Magnitude',
        description: 'Run "npx create-magnitude-app" and follow the instructions',
    },
});

// It can also handle low-level actions
await agent.act('Drag "Use Magnitude" to the top of the in progress column');

// Intelligently extract data based on the DOM content matching a provided zod schema
const tasks = await agent.extract(
    'List in progress tasks',
    z.array(z.object({
        title: z.string(),
        description: z.string(),
        // Agent can extract existing data or new insights
        difficulty: z.number().describe('Rate the difficulty between 1-5')
    })),
);
```

## Get started

### Running your first browser automation
```bash
npx create-magnitude-app
```

This will create a new project and walk you through the steps for setting up Magnitude. It will also create an example script that you can run right away!

### Using the test runner
To install the test runner for use in an **existing** web app, please run:
```bash
npm i --save-dev magnitude-test && npx magnitude init
```

This will create a basic tests directory `tests/magnitude` with:
- `magnitude.config.ts`: Magnitude test configuration file
- `example.mag.ts`: An example test file

For information on how to run tests and integrate into CI/CD see [here](https://docs.magnitude.run/core-concepts/running-tests).

> [!NOTE]
> Magnitude requires a large **visually grounded** model. We recommend Claude Sonnet 4 for the best performance, but are also compatible with Qwen-2.5VL 72B. See [docs](https://docs.magnitude.run/customizing/llm-configuration) for more information.


## Why Magnitude?
❌ **Problem #1:** Most browser agents draw numbered boxes around page elements - doesn't generalize well due to complex modern sites

✅ **Solution: Vision-first architecture**
* Visually grounded LLM specifies pixel coordinates
* True generalization independent of DOM structure
* Future-proof architecture for desktop apps, VMs, etc.

❌ **Problem #2:** Most browser agents follow "high-level prompt + tools = work until done" - works for demos, not production

✅ **Solution: Controllable & repeatable automation**
* Flexible abstraction levels (granular actions vs. flows)
* Custom actions + prompts at agent and action level
* Deterministic runs via native caching system *(in progress)*

## ❓ Frequently Asked Questions

### What is Magnitude?
Magnitude is a **vision-first browser agent framework** that uses visually grounded AI to control browsers with natural language. It scores 94% on WebVoyager benchmarks and enables automation, testing, and data extraction.

### How does Magnitude differ from other browser agents?
**Traditional approach:** Most agents draw numbered boxes around DOM elements and rely on HTML structure parsing.
**Magnitude approach:** Uses pixel-level vision coordinates from visually grounded LLMs (Claude Sonnet 4, Qwen-2.5VL 72B). This enables true generalization across complex modern sites and is future-proof for desktop apps/VMs.

### What models does Magnitude support?
- **Claude Sonnet 4** (recommended for best performance)
- **Qwen-2.5VL 72B** (alternative option)
See [LLM Configuration docs](https://docs.magnitude.run/customizing/llm-configuration) for setup.

### How do I get started?
```bash
# Create a new project with guided setup
npx create-magnitude-app
```

### How do I run tests in an existing project?
```bash
npm i --save-dev magnitude-test && npx magnitude init
```
This creates `tests/magnitude/` with config and example tests.

### Can Magnitude handle high-level tasks or just clicks?
Both! Magnitude supports flexible abstraction levels:
- **High-level tasks:** `agent.act("Create a task")` - plans and executes complex flows
- **Low-level actions:** `agent.act("Drag task to top")` - precise mouse/keyboard control

### How does data extraction work?
Use `agent.extract()` with Zod schemas:
```ts
const tasks = await agent.extract(
  "List in progress tasks",
  z.array(z.object({
    title: z.string(),
    description: z.string(),
    difficulty: z.number().describe("Rate difficulty 1-5")
  }))
);
```

### What is the test runner?
Magnitude includes a built-in test runner with powerful visual assertions for web app testing. See [Running Tests docs](https://docs.magnitude.run/core-concepts/running-tests) for CI/CD integration.

### Is Magnitude deterministic?
Deterministic runs via native caching system are **in progress**. Currently, runs may vary slightly due to LLM behavior.

### Where can I find more documentation?
See [docs.magnitude.run](https://docs.magnitude.run) for guides on:
- Getting started
- Core concepts
- Custom actions and prompts
- LLM configuration
- Running tests
- CI/CD integration

### How can I get help?
- Join [Discord community](https://discord.gg/VcdpMh9tTy) for questions and suggestions
- Enterprise users: contact founders@magnitude.run or schedule a call

## Additional info

Please see [our docs](https://docs.magnitude.run) for more information on how to best build Magnitude automations and test cases.

## Contact
If you are an enterprise and want more features or support, feel free to reach out to us at founders@magnitude.run or schedule a call [here](https://cal.com/tom-greenwald/30min) to discuss your needs.

You can also join our <a href="https://discord.gg/VcdpMh9tTy" target="_blank">Discord community</a> for help or any suggestions!
