# Project-A0

## About 📖

This is a mono repo forked from [ink!athon](https://github.com/scio-labs/ink!athon) for dapp development on Aleph Zero.

## Getting started

### 1. Run the frontend

The frontend works out of the box, without a local node running, as the sample contract is pre-deployed on certain live testnets (i.e. `alephzero-testnet`). Necessary deployment metadata and addresses are provided under `contracts/deployments/`.

> **Pre-requisites:**
>
> - Setup Node.js v18+ (recommended via [nvm](https://github.com/nvm-sh/nvm) with `nvm install 18`)
> - Install [pnpm](https://pnpm.io/installation) (recommended via [Node.js Corepack](https://nodejs.org/api/corepack.html) or `npm i -g pnpm`)
> - Clone this repository

<details>
<summary><strong>Special Instructions for Windows Users</strong></summary>

> [!IMPORTANT]  
> Windows users must either use [WSL](https://learn.microsoft.com/windows/wsl/install) (recommended) or a custom shell like [Git Bash](https://git-scm.com/downloads). PowerShell is not supported.

> **Pre-requisites when using WSL for Linux:**
>
> - Install [WSL](https://learn.microsoft.com/windows/wsl/install) and execute _all_ commands in the WSL terminal
> - Setup Node.js v18+ (recommended via [nvm](https://github.com/nvm-sh/nvm) with `nvm install 18`)
> - Install the following npm packages globally:
> - `npm i -g npm`
> - `npm i -g pnpm node-gyp make`
> - Clone this repository into the WSL file system (e.g. `/home/<user>/inkathon`).
>
> **Tip:** You can enter `\\wsl$\` in the top bar of the Windows Explorer to access the WSL file system visually.

</details>

```bash
# Install dependencies (once)
# NOTE: This automatically creates an `.env.local` file
pnpm install

# Start Next.js frontend
pnpm run dev
```

Optionally, to enable [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) (for automatic linting & formatting when committing), you can run the following command once: `pnpm simple-git-hooks`.

### 2. Build & deploy contracts on a local node or fork

The `contracts/package.json` file contains shorthand scripts for building, testing, and deploying your contracts. To run these scripts, you need to set `contracts/` as the active working directory in your terminal.

> **Pre-requisites:**
>
> - Install Rust and Ink via the [Aleph Zero Docs](https://docs.alephzero.org/aleph-zero/build/aleph-zero-smart-contracts-basics/installing-required-tools) 
> - Optional: Install [`substrate-contracts-node`](https://github.com/paritytech/substrate-contracts-node) for running local substrate node

```bash
# Build contracts and move artifacts to `contracts/deployments/{contract}/` folders
pnpm run build

# Start local node with persistence (contracts stay deployed after restart)
# NOTE: When using Brave, shields have to be taken down for the UIs
pnpm run node

## IMPORTANT: Open a separate terminal window and keep the node running

# Forks Aleph Zero Testnet and runs it locally
pnpm run fork-testnet

# Deploy the contracts on the local node
pnpm run deploy
```

Alternatively, you can also deploy contracts manually using [Contracts UI](https://contracts-ui.substrate.io/) (`pnpm contracts-ui`) in the browser.

### 3. Connect the frontend to the local node

Open the `frontend/.env.local` file and set the `NEXT_PUBLIC_DEFAULT_CHAIN` variable to `development`. Then restart the frontend and you should be able to interact with the contracts deployed on your local node.

_Read more about environment variables and all available chain constants in the [Environment Variables](#environment-variables) section below._
## Contract Tests
### Jest
Smart contract tests written with Jest are located in `/contracts/test`.
```bash
# Run all test suites
pnpm test

# Run specific test suite abaxcaller
pnpm test abaxcaller
```
> [!WARNING]  
> After the tests are completed, close the terminal running the fork before restarting the tests.

## Deployment 🚢

Spinning up a deployment via Vercel is pretty straightforward as the necessary settings are already configured in `vercel.json`. If you haven't cloned the repository yet, you can also use the **Deploy** button below to create a new repository from this template.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fhello-world&env=NEXT_PUBLIC_DEFAULT_CHAIN&envDescription=Insert%20%60alephzero-testnet%60%20or%20%60shibuya%60&envLink=https%3A%2F%2Fgithub.com%2Fscio-labs%2Finkathon%23environment-variables&project-name=inkathon&repository-name=inkathon&redirect-url=https%3A%2F%2Fgithub.com%2Fscio-labs%2Finkathon&demo-url=https%3A%2F%2Finkathon.xyz)

### Environment Variables

One key element making this boilerplate so flexible is the usage of environment variables to configure the active network in the frontend. This is done by setting the `NEXT_PUBLIC_DEFAULT_CHAIN` variable in the `frontend/.env.local` file, or in the Vercel deployment settings respectively.

<details>
<summary><strong>All Supported Chain Constants</strong></summary>

| Network Identifier  | Name                    | Type    |
| ------------------- | ----------------------- | ------- |
| `development`       | ️Local Development Node | Testnet |
| `alephzero-testnet` | Aleph Zero Testnet      | Testnet |
| `rococo`            | Rococo                  | Testnet |
| `shibuya`           | Shibuya Testnet         | Testnet |
| `shiden`            | Shiden                  | Mainnet |
| `alephzero`         | Aleph Zero              | Mainnet |
| `astar`             | Astar                   | Mainnet |

<small>Source: https://github.com/scio-labs/use-inkathon/blob/main/src/chains.ts</small>

> [!NOTE]  
> Chains can also be supplied manually by creating a [`SubstrateChain`](https://github.com/scio-labs/use-inkathon/blob/main/src/chains.ts#L4) object. If you think a chain is missing, please open an issue or PR.

</details>

All environment variables are imported from `process.env` in [`frontend/src/config/environment.ts`](https://github.com/scio-labs/inkathon/blob/main/frontend/src/config/environment.ts) for type safety.

| Environment Variables           | [Default Values](https://github.com/scio-labs/inkathon/blob/main/frontend/.env.local.example) | Description                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEFAULT_CHAIN` \*️⃣ | ️`alephzero-testnet`                                                                          | The network (Substrate-based chain) the frontend should connect to by default and what contract deployment artifacts to import.                                     |
| `NEXT_PUBLIC_PRODUCTION_MODE`   | `false`                                                                                       | Optional boolean flag to differentiate production environment (e.g. for SEO or Analytics).                                                                          |
| `NEXT_PUBLIC_URL`               | `http://localhost:3000`                                                                       | Optional string that defines the base URL of the frontend (will be auto-inferred from Vercel environment variables).                                                |
| `NEXT_PUBLIC_SUPPORTED_CHAINS`  | –                                                                                             | Optional array with network identifers (e.g. `["alephzero-testnet", "alephzero"]`) that are supported by the frontend, **if the dApp is supposed to be multi-chain**. |

<small>\*️⃣ Required </small>

### Contract Deployment

In the [Getting Started](#getting-started) section above, we've already deployed the sample contracts on a local node. To target a live network, we can use the `CHAIN` environment variable when running the `deploy` script.

```bash
CHAIN=alephzero-testnet pnpm run deploy
```

Further, dynamically loaded environment files with the `.env.{chain}` naming convention can be used to add additional configuration about the deployer account.

```bash
# .env.alephzero-testnet
ACCOUNT_URI=bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice
```

When running the same script again, this deployer account defined there will be used to sign the extrinsic.

> [!WARNING]  
> These files are gitignored by default, but you should still be extra cautious when adding sensitive information to them.


## Customization 🎨

### 1. Project Name

There are multiple places where you need to insert your project's name and identifier. Most of these occurrences are highlighted with a `/* TODO */` comment in the code. You can easily replace them one by one by installing the [`todo-tree`](https://marketplace.visualstudio.com/items?itemName=gruntfuggly.todo-tree) plugin.

Additionally, there are the following un-highlighted occurrences:

- the name of the `inkathon.code-workspace` file
- the `package.json`'s name & metadata in the root directory as well as in the `contracts/` and `frontend/` packages
- the workspace dependency (`@inkathon/contracts`) defined in `frontend/package.json` and imported in `frontend/src/deployments/deployments.ts`

### 2. Custom Contracts

To add a new one, you need to do the following:

- Add a new contract directory under `contracts/src/`
- Add it as another workspace member to the `contracts/Cargo.toml` file
- Adjust the deployment script `contracts/scripts/deploy.ts`
- Adjust the `ContractIds` enum and `getDeployments` function in `frontend/src/deployments/deployments.ts`

### 3. Custom Scripts

Adding custom scripts is useful to interact with your contracts or test certain functionality. Therefore, just duplicate & reuse the `contracts/scripts/script.template.ts` file and run it via `pnpm run script <script-name>`. This command will run the TypeScript file directly via [`tsx`](https://github.com/privatenumber/tsx).

For general scripts, the same environment variable initialization & configuration applies as described below in the [Deployment](#deployment) section (e.g. to change the target network).

## The Stack 🥞

<summary><strong>The Stack in Detail</strong></summary>

- Monorepo Workspace with `contracts/` and `frontend/` directories as packages.
- Package Manager: `pnpm` or `yarn@stable` (Read more in the [FAQs](#faqs--troubleshooting) section below)
- Smart Contract Development: Rust, ink!, `cargo-contract`, `substrate-contracts-node`
- Frontend: Next.js, React, TypeScript
  - Contract Interactions: `polkadot-js`, [`useInkathon`](https://github.com/scio-labs/use-inkathon) React Hooks & Utility Library (alternatively: [`useInk`](https://use.ink/frontend/getting-started))
  - Styling: `chakra`, `tailwindcss`, `twin.macro`, `emotion`
  - Linting & Formatting: `eslint`, `prettier`, `simple-git-hooks`, `lint-staged`

<small>Styling, linting, and formatting libraries can be fully dropped or replaced with alternatives.</small>

## Plugins

Additionally, the VSCode plugins listed below are recommended as they can be very helpful when working with this boilerplate.

<details>
<summary><strong>All Recommended Plugins</strong></summary>

| Plugin Name                                                                                                                            | Description                                  |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [`dbaeumer.vscode-eslint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)                                 | Adds ESLint editor support.                  |
| [`esbenp.prettier-vscode`](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)                                 | Adds Prettier editor support.                |
| [`bradlc.vscode-tailwindcss`](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)                           | Adds tailwindcss editor support.             |
| [`lightyen.tailwindcss-intellisense-twin`](https://marketplace.visualstudio.com/items?itemName=lightyen.tailwindcss-intellisense-twin) | Adds twin.macro editor support.              |
| [`rust-lang.rust-analyzer`](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)                               | Adds Rust language support.                  |
| [`ink-analyzer.ink-analyzer`](https://marketplace.visualstudio.com/items?itemName=ink-analyzer.ink-analyzer)                           | Adds ink! language support.                  |
| [`tamasfe.even-better-toml`](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml)                             | Adds `.toml` file support.                   |
| [`gruntfuggly.todo-tree`](https://marketplace.visualstudio.com/items?itemName=gruntfuggly.todo-tree)                                   | Lists all `TODO` comments in your workspace. |
| [`wayou.vscode-todo-highlight`](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight)                       | Lists all `TODO` comments in your workspace. |
| [`mikestead.dotenv`](https://marketplace.visualstudio.com/items?itemName=mikestead.dotenv)                                             | Adds syntax highlighting for `.env` files.   |

</details>

## FAQs & Troubleshooting 💬

<details>
<summary><strong>Which package managers are supported? Do I have to use pnpm?</strong></summary>

For monorepo workspaces, [pnpm](https://pnpm.io) is likely the fastest and most reliable choice. When using it though, it's strongly recommended everyone on the team uses it. No installs should be performed nor any other lock files should be committed.

As an alternative, [yarn](https://yarnpkg.com/) is also supported and can be used for installation. Caveats when using yarn:

- Only the stable version of yarn (currently v3) is supported, not [yarn classic](https://classic.yarnpkg.com/) (v1).
- `yarn.lock` files should be committed instead of `.pnpm-lock.yaml` files.
- The `pnpm` CLI is still used in many `package.json` scripts, so these would have to be adjusted manually.

> [!IMPORTANT]  
> As [npm](https://www.npmjs.com/) lacks support for the `workspace` import protocol, it's not compatible with ink!athon.

</details>

<details>
<summary><strong>How to solve `Cannot find module './greeter/development.ts'`?</strong></summary>

Sometimes, Next.js doesn't pick up changes (i.e. file creations) in the `contracts/deployments/{contract}/` folders correctly. E.g., when you just deployed on a local node for the first time and set the frontend's `.env.local` to connect to the `development` network.

To fix this, you can delete the build cache at `frontend/.next`. This is currently the only solution and will force Next.js to rebuild the project and pick up the new files.

> [!NOTE]  
> To prevent this behavior, the `contracts/package.json` file contains a small `postinstall` script that creates an empty `development.ts` file if none exists.

</details>

<details>
<summary><strong>How to approach styling?</strong></summary>

This boilerplate currently offers styling via the following options.

- [Chakra UI](https://chakra-ui.com/) – Component library for quick prototyping e.g. during hackathons)
- [twin.macro](https://github.com/ben-rogerson/twin.macro) – [Tailwindcss](https://tailwindcss.com/) within Styled Components via [Emotion](https://emotion.sh/docs/styled) (see [snippets](#snippets))
- Standard (S)CSS styles via `className` and `*.module.(s)css` files.

> [!IMPORTANT]  
> To reduce the bundle size in production, it's recommended to use either option 1 or 2, but not both.

</details>

<details>
<summary><strong>Can I just use plain TailwindCSS?</strong></summary>

The packages mentioned above can be replaced with vanilla TailwindCSS manually without much effort.

> [!NOTE]  
> We are currently transitioning from twin.macro to vanilla TailwindCSS as the new default. This will be reflected in the boilerplate soon.

</details>

<details>
<summary><strong>Resources to learn more about Substrate, ink!, and polkadot.js</strong></summary>

- [ink! Documentation](https://use.ink/)
- [polkadot.js Documentation](https://polkadot.js.org/docs/)
- [Polkadot Wiki ink! Tools](https://wiki.polkadot.network/docs/build-open-source)
- [Aleph Zero Documentation](https://docs.alephzero.org/aleph-zero/build/)
- [ink!athon Workshop Recording](https://youtube.com/watch?v=SoNLZfsd0mQ)
- [ink!athon Telegram Group](https://t.me/inkathon)

</details>
