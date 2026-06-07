class TerminalResume {
  constructor() {
    this.output = document.getElementById("output");
    this.input = document.getElementById("command-input");
    this.terminal = document.querySelector(".terminal");
    this.terminalContainer = document.querySelector(".terminal-container");
    this.contextMenu = document.querySelector(".context-menu");
    this.terminals = [{ input: this.input, history: [], historyIndex: -1 }];
    this.activeTerminal = 0;
    this.activeTerminalContent = null;
    this.resizing = null;

    // New properties for themes and game
    this.themeStorageKey = "terminal-theme";
    this.availableThemes = ["default", "dracula", "solarized", "nord"];
    const savedTheme =
      localStorage.getItem(this.themeStorageKey) || localStorage.getItem("theme");
    this.currentTheme = this.availableThemes.includes(savedTheme)
      ? savedTheme
      : "default";
    this.projects = [];
    this.skills = {};
    this.gameActive = false;

    // Initialize modals
    this.themeModal = document.getElementById("theme-modal");
    this.projectsModal = document.getElementById("projects-modal");
    this.skillsModal = document.getElementById("skills-modal");

    // Initialize theme selector
    this.themeToggle = document.getElementById("theme-toggle");

    this.setupEventListeners();
    this.loadProjects();
    this.loadSkills();
    this.init();
  }

  init() {
    // Apply saved theme
    this.handleThemeChange(this.currentTheme);

    // Set up modal close buttons
    document.querySelectorAll(".close-button").forEach((button) => {
      button.addEventListener("click", () => {
        this.closeModal(button.closest(".modal"));
      });
    });

    // Theme toggle
    this.themeToggle.addEventListener("click", () => {
      this.showModal(this.themeModal);
    });

    // Theme selection
    document.querySelectorAll(".theme-option").forEach((option) => {
      option.addEventListener("click", () => {
        this.handleThemeChange(option.dataset.theme);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.querySelectorAll(".modal.active").forEach((modal) => {
          this.closeModal(modal);
        });
      }
    });

    this.printWelcomeMessage();
    this.input.focus();
    this.setupContextMenu();
  }

  setupContextMenu() {
    // Handle right-click on terminal content
    this.terminalContainer.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const terminalContent = e.target.closest(".terminal-content");
      if (terminalContent) {
        this.activeTerminalContent = terminalContent;
        this.showContextMenu(e.clientX, e.clientY);
      }
    });

    // Hide context menu on click outside
    document.addEventListener("click", () => {
      this.contextMenu.classList.remove("active");
    });

    // Handle menu item clicks
    this.contextMenu.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextMenuAction(action);
      }
    });
  }

  showContextMenu(x, y) {
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("active");

    // Show/hide close option based on whether this terminal can be closed
    const closeOption = this.contextMenu.querySelector(
      '[data-action="close-split"]'
    );
    const isMainTerminal =
      this.activeTerminalContent === this.terminalContainer.firstElementChild;
    closeOption.style.display = isMainTerminal ? "none" : "block";
  }

  handleContextMenuAction(action) {
    if (!this.activeTerminalContent) return;

    switch (action) {
      case "split-h":
        this.splitTerminal("horizontal", this.activeTerminalContent);
        break;
      case "split-v":
        this.splitTerminal("vertical", this.activeTerminalContent);
        break;
      case "close-split":
        this.closeSplit(this.activeTerminalContent);
        break;
    }
    this.contextMenu.classList.remove("active");
  }

  setupEventListeners() {
    // Global click handler for terminal focus
    this.terminalContainer.addEventListener("click", (e) => {
      const terminalContent = e.target.closest(".terminal-content");
      if (terminalContent) {
        const input = terminalContent.querySelector("input");
        if (input) {
          input.focus();
          this.activeTerminal = this.terminals.findIndex(
            (t) => t.input === input
          );
        }
      }
    });

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl + Shift + H for horizontal split
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const activeContent =
          this.terminals[this.activeTerminal].input.closest(
            ".terminal-content"
          );
        if (activeContent) {
          this.splitTerminal("horizontal", activeContent);
        }
      }
      // Ctrl + Shift + V for vertical split
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const activeContent =
          this.terminals[this.activeTerminal].input.closest(
            ".terminal-content"
          );
        if (activeContent) {
          this.splitTerminal("vertical", activeContent);
        }
      }
    });

    // Setup initial input handlers
    this.setupInputHandlers(this.input);
  }

  setupInputHandlers(inputElement) {
    inputElement.addEventListener("keydown", (e) => {
      const terminal = this.terminals.find((t) => t.input === inputElement);
      if (!terminal) return;

      if (e.key === "Enter") {
        this.handleCommand(inputElement);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateHistory("up", terminal);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateHistory("down", terminal);
      } else if (e.key === "l" && e.ctrlKey) {
        // Handle Ctrl+L (clear screen)
        e.preventDefault();
        const outputElement = inputElement
          .closest(".terminal-content")
          .querySelector("[id^='output']");
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
      } else if (e.key === "Tab") {
        // Handle Tab completion
        e.preventDefault();
        this.handleTabCompletion(inputElement);
      }
    });
  }

  handleTabCompletion(inputElement) {
    const currentInput = inputElement.value.toLowerCase().trim();
    const commands = [
      "help",
      "about",
      "skills",
      "experience",
      "education",
      "contact",
      "clear",
      "projects",
      "skills-visual",
      "game",
      "exit-game",
      "matrix",
      "stop-matrix",
      "calc",
      "calculate",
      "linkedin-cover",
    ];

    // Find matching commands
    const matches = commands.filter((cmd) => cmd.startsWith(currentInput));

    if (matches.length === 1) {
      // Single match - complete the command
      inputElement.value = matches[0];
    } else if (matches.length > 1 && currentInput) {
      // Multiple matches - show possibilities
      const outputElement = inputElement
        .closest(".terminal-content")
        .querySelector("[id^='output']");

      const matchesText = `\nPossible commands:\n${matches.join("  ")}`;
      this.printToOutput(outputElement, matchesText, "info");
    }
  }

  navigateHistory(direction, terminal) {
    if (
      direction === "up" &&
      terminal.historyIndex < terminal.history.length - 1
    ) {
      terminal.historyIndex++;
    } else if (direction === "down" && terminal.historyIndex > -1) {
      terminal.historyIndex--;
    }

    if (
      terminal.historyIndex >= 0 &&
      terminal.historyIndex < terminal.history.length
    ) {
      terminal.input.value =
        terminal.history[terminal.history.length - 1 - terminal.historyIndex];
    } else {
      terminal.input.value = "";
    }
  }

  splitTerminal(direction, sourceTerminal) {
    const parentContainer = sourceTerminal.parentElement;
    const isAlreadySplit = parentContainer.children.length > 1;
    const splitClass = direction === "horizontal" ? "split-h" : "split-v";

    // If parent is not split or split in different direction, create new container
    if (!isAlreadySplit || !parentContainer.classList.contains(splitClass)) {
      const newContainer = document.createElement("div");
      newContainer.className = `terminal-container ${splitClass}`;

      // Move source terminal to new container
      sourceTerminal.parentElement.insertBefore(newContainer, sourceTerminal);
      newContainer.appendChild(sourceTerminal);

      // Create new terminal in the container
      this.createNewTerminalContent(newContainer);
    } else {
      // Add new terminal to existing split container
      this.createNewTerminalContent(parentContainer);
    }
  }

  createNewTerminalContent(container) {
    const newContent = document.createElement("div");
    newContent.className = "terminal-content";
    const timestamp = Date.now();
    newContent.innerHTML = `
      <div id="output-${timestamp}" class="terminal-output"></div>
      <div class="input-line">
        <span class="prompt">&gt;</span>
        <input type="text" id="command-input-${timestamp}" class="command-input" />
      </div>
    `;

    // Add resize handle if not the last element
    if (container.children.length > 0) {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${
        container.classList.contains("split-h") ? "horizontal" : "vertical"
      }`;
      container.lastElementChild.appendChild(handle);
      this.setupResizeHandle(handle);
    }

    container.appendChild(newContent);

    // Setup new input
    const newInput = newContent.querySelector(".command-input");
    this.setupInputHandlers(newInput);

    // Add to terminals array
    this.terminals.push({
      input: newInput,
      history: [],
      historyIndex: -1,
    });

    // Print welcome message in new terminal
    const newOutput = newContent.querySelector(`#output-${timestamp}`);
    this.printWelcomeMessage(newOutput);

    // Focus new terminal
    newInput.focus();
    this.activeTerminal = this.terminals.length - 1;
  }

  setupResizeHandle(handle) {
    const isHorizontal = handle.classList.contains("horizontal");

    const startResize = (e) => {
      e.preventDefault();
      this.resizing = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        parentContainer: handle.closest(".terminal-container"),
        element: handle.parentElement,
        initialSize: isHorizontal
          ? handle.parentElement.offsetWidth
          : handle.parentElement.offsetHeight,
      };

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      if (!this.resizing) return;

      const { parentContainer, element, startX, startY, initialSize } =
        this.resizing;
      const containerRect = parentContainer.getBoundingClientRect();

      if (isHorizontal) {
        const deltaX = e.clientX - startX;
        const newWidth = initialSize + deltaX;
        const maxWidth = containerRect.width - 150; // Leave space for other splits

        if (newWidth >= 150 && newWidth <= maxWidth) {
          const percentage = (newWidth / containerRect.width) * 100;
          element.style.flex = "none";
          element.style.width = `${percentage}%`;
        }
      } else {
        const deltaY = e.clientY - startY;
        const newHeight = initialSize + deltaY;
        const maxHeight = containerRect.height - 100;

        if (newHeight >= 100 && newHeight <= maxHeight) {
          const percentage = (newHeight / containerRect.height) * 100;
          element.style.flex = "none";
          element.style.height = `${percentage}%`;
        }
      }
    };

    const stopResize = () => {
      this.resizing = null;
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    handle.addEventListener("mousedown", startResize);
  }

  printToOutput(outputElement, text, className = "", useTypewriter = false) {
    if (!text) {
      outputElement.innerHTML = "";
      return Promise.resolve();
    }

    const line = document.createElement("div");
    line.className = className;

    // Ensure consistent text formatting
    line.style.whiteSpace = "pre-wrap";
    line.style.marginBottom = "0.5rem";

    outputElement.appendChild(line);

    // Force scroll to bottom
    this.scrollToBottom(outputElement.closest(".terminal-content"));

    if (useTypewriter && !text.includes("<")) {
      // For plain text, use typewriter effect
      return this.typeText(line, text, 20);
    } else if (useTypewriter && text.includes("<")) {
      // For HTML content, use HTML typewriter
      return this.typeHTML(line, text, 20);
    } else {
      // No typewriter effect
      line.textContent = text;
      return Promise.resolve();
    }
  }

  scrollToBottom(terminalContent) {
    if (!terminalContent) return;

    // Only scroll if content is actually overflowing
    if (terminalContent.scrollHeight > terminalContent.clientHeight) {
      const currentScrollTop = terminalContent.scrollTop;
      const maxScroll =
        terminalContent.scrollHeight - terminalContent.clientHeight;

      // If we're not already at the bottom, scroll
      if (currentScrollTop < maxScroll) {
        terminalContent.scrollTop = maxScroll;

        // Use requestAnimationFrame to ensure scroll happens after render
        requestAnimationFrame(() => {
          terminalContent.scrollTop = maxScroll;
        });
      }
    }
  }

  handleCommand(inputElement) {
    const terminal = this.terminals.find((t) => t.input === inputElement);
    if (!terminal) return;

    const command = inputElement.value.trim().toLowerCase();
    const outputElement = inputElement
      .closest(".terminal-content")
      .querySelector("[id^='output']");

    this.printToOutput(outputElement, `> ${command}`, "command");
    terminal.history.push(command);
    terminal.historyIndex = -1;
    inputElement.value = "";

    // Parse command and arguments
    const [cmd, ...args] = command.split(" ");

    // Execute command
    switch (cmd) {
      case "help":
        this.showHelp(outputElement);
        break;
      case "about":
        this.showAbout(outputElement);
        break;
      case "experience":
        this.showExperience(outputElement);
        break;
      case "education":
        this.showEducation(outputElement);
        break;
      case "skills":
        this.showSkills(outputElement);
        break;
      case "contact":
        this.showContact(outputElement);
        break;
      case "clear":
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
        break;
      case "projects":
        this.showProjects();
        break;
      case "skills-visual":
        this.showSkillsVisualization();
        break;
      case "game":
        this.initGame();
        break;
      case "linkedin-cover":
        this.generateLinkedInCover(outputElement);
        break;
      case "exit-game":
        this.endGame();
        this.printToOutput(outputElement, "Game exited.", "info");
        break;
      case "matrix":
        this.startMatrixEffect(outputElement);
        break;
      case "stop-matrix":
        this.stopMatrixEffect();
        this.printToOutput(outputElement, "Matrix effect stopped.", "info");
        break;
      case "calc":
      case "calculate":
        this.calculate(args.join(" "), outputElement);
        break;
      case "":
        break;
      default:
        this.printToOutput(
          outputElement,
          `Command not found: ${command}. Type 'help' for available commands.`,
          "error"
        );
    }

    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  printWelcomeMessage(outputElement = this.output) {
    const asciiArt = `DEEPENDRA RATHOD`;
    const divider = "============================================================";

    const welcome =
      this.wrapWithColor(asciiArt + "\n", "#d4843e") +
      this.wrapWithColor(divider + "\n", "#555555") +
      this.wrapWithColor("              Interactive Terminal Resume\n", "#888888") +
      this.wrapWithColor("          Systems-Focused Software Engineer\n", "#666666") +
      this.wrapWithColor(" Rust | TypeScript | Performance | Verification\n", "#666666") +
      this.wrapWithColor(divider + "\n\n", "#555555") +
      this.wrapWithColor("Type ", "#666666") +
      this.wrapWithColor("'help'", "#87af87") +
      this.wrapWithColor(" to see available commands\n", "#666666") +
      this.wrapWithColor("Press ", "#666666") +
      this.wrapWithColor("'tab'", "#87af87") +
      this.wrapWithColor(" to auto-complete commands", "#666666");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = welcome;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showHelp(outputElement = this.output) {
    const title = this.wrapWithColor("Available Commands\n\n", "#ffff00");

    const mainCommands =
      this.wrapWithColor("Main Commands:\n", "#00ffff") +
      this.wrapWithColor("- help", "#98fb98") + "        " + this.wrapWithColor("Show this help menu\n", "#ffffff") +
      this.wrapWithColor("- about", "#98fb98") + "       " + this.wrapWithColor("Display professional summary\n", "#ffffff") +
      this.wrapWithColor("- skills", "#98fb98") + "      " + this.wrapWithColor("View technical expertise\n", "#ffffff") +
      this.wrapWithColor("- experience", "#98fb98") + "  " + this.wrapWithColor("Show work history\n", "#ffffff") +
      this.wrapWithColor("- education", "#98fb98") + "   " + this.wrapWithColor("View education and achievements\n", "#ffffff") +
      this.wrapWithColor("- contact", "#98fb98") + "     " + this.wrapWithColor("Get contact information\n", "#ffffff") +
      this.wrapWithColor("- clear", "#98fb98") + "       " + this.wrapWithColor("Clear the terminal\n\n", "#ffffff");

    const utilityCommands =
      this.wrapWithColor("Utility Commands:\n", "#00ffff") +
      this.wrapWithColor("- projects", "#98fb98") + "    " + this.wrapWithColor("Open project showcase\n", "#ffffff") +
      this.wrapWithColor("- skills-visual", "#98fb98") + " " + this.wrapWithColor("Show skills visualization\n", "#ffffff") +
      this.wrapWithColor("- game", "#98fb98") + "        " + this.wrapWithColor("Play Snake\n", "#ffffff") +
      this.wrapWithColor("- matrix", "#98fb98") + "      " + this.wrapWithColor("Start matrix effect\n", "#ffffff") +
      this.wrapWithColor("- calc", "#98fb98") + "        " + this.wrapWithColor("Calculator\n", "#ffffff") +
      this.wrapWithColor("- linkedin-cover", "#98fb98") + " " + this.wrapWithColor("Generate cover image\n\n", "#ffffff");

    const shortcuts =
      this.wrapWithColor("Shortcuts:\n", "#00ffff") +
      this.wrapWithColor("- Up/Down", "#666666") + "    " + this.wrapWithColor("Navigate command history\n", "#444444") +
      this.wrapWithColor("- Tab", "#666666") + "        " + this.wrapWithColor("Auto-complete commands\n", "#444444") +
      this.wrapWithColor("- Ctrl+L", "#666666") + "     " + this.wrapWithColor("Clear the screen", "#444444");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = title + mainCommands + utilityCommands + shortcuts;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showAbout(outputElement = this.output) {
    const about = `<span style="color: #ff8c00; font-weight: bold;">About Me</span>

${this.wrapWithColor("Deependra Rathod", "#00ffff")}
${this.wrapWithColor("Systems-focused software engineer building performance-engineered developer infrastructure, repository intelligence, and reliable real-time products.", "#ffffff")}

${this.wrapWithColor("Evidence hierarchy", "#ff8c00")}
- ${this.wrapWithColor("GitGraph Lab: public Rust flagship for Git indexing, graph queries, CI, and benchmark gates", "#ffffff")}
- ${this.wrapWithColor("RepoBrain OS: deepest private system for deterministic repository cognition, evidence receipts, and semantic verification", "#ffffff")}
- ${this.wrapWithColor("Private work: event-driven TypeScript systems with real-time workflows, resilience controls, and automated verification", "#ffffff")}

${this.wrapWithColor("Core stack", "#ff8c00")}
${this.wrapWithColor("Rust, TypeScript, LMDB, Tree-sitter, MCP, Fastify, PostgreSQL, Redis, Kafka, AWS, CI/CD", "#87cefa")}`;

    const aboutDiv = document.createElement("div");
    aboutDiv.innerHTML = about;
    outputElement.appendChild(aboutDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  // Helper method to wrap text with color
  wrapWithColor(text, color) {
    return `<span style="color: ${color}">${text}</span>`;
  }

  // Typewriter effect for terminal outputs
  typeText(element, text, speed = 30) {
    if (!element || !text) return Promise.resolve();

    return new Promise((resolve) => {
      let index = 0;
      element.textContent = "";
      element.style.display = "inline-block";

      const interval = setInterval(() => {
        if (index < text.length) {
          element.textContent += text.charAt(index);
          index++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  // Apply typewriter effect to HTML content
  async typeHTML(element, html, speed = 30) {
    if (!element || !html) return Promise.resolve();

    // Create a temporary div to hold the HTML
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Get text nodes and elements in order
    const walker = document.createTreeWalker(
      temp,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    const nodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      nodes.push(currentNode);
    }

    // Clear the target element
    element.innerHTML = "";

    // Process each node
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const span = document.createElement("span");
        element.appendChild(span);
        await this.typeText(span, node.textContent, speed);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        element.appendChild(clone);

        // If this is a style or has no children, just add it as is
        if (node.tagName === "STYLE" || !node.hasChildNodes()) {
          clone.innerHTML = node.innerHTML;
        }
      }
    }

    return Promise.resolve();
  }

  showExperience(outputElement = this.output) {
    const experience = `<span style="color: #ffff00; font-weight: bold;">Professional Experience</span>

<span style="color: #00ffff;">STEALTH STARTUP | Full-Stack AI Developer Intern</span>
${this.wrapWithColor("Nov 2025 - Present | Hyderabad, India (Hybrid)", "#ffffff")}
- ${this.wrapWithColor("Contribute across private TypeScript monorepos spanning React/Next.js interfaces and Node.js services.", "#ffffff")}
- ${this.wrapWithColor("Build secure authentication, real-time workflows, asynchronous jobs, observability, and automated tests.", "#ffffff")}
- ${this.wrapWithColor("Work within product confidentiality while supporting release quality and maintainable delivery.", "#ffffff")}

<span style="color: #00ffff;">CODINGPANDA | Software Developer Intern</span>
${this.wrapWithColor("Sept 2025 - Nov 2025 | Bangalore, India (Remote)", "#ffffff")}
- ${this.wrapWithColor("Built modular Node.js/Express APIs for high-volume workflows, increasing throughput by 25%.", "#ffffff")}
- ${this.wrapWithColor("Enhanced Redis caching and API batching to reduce latency and server overhead.", "#ffffff")}
- ${this.wrapWithColor("Collaborated with UI/UX on accessible dashboard components and regression-aware handoffs.", "#ffffff")}`;

    const experienceDiv = document.createElement("div");
    experienceDiv.innerHTML = experience;
    outputElement.appendChild(experienceDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showEducation(outputElement = this.output) {
    const education = `<span style="color: #ff8c00; font-weight: bold;">Education</span>

${this.wrapWithColor("Indian Institute of Information Technology, Ranchi", "#00ffff")}
${this.wrapWithColor("B.Tech in Computer Science and Engineering", "#ffffff")}
${this.wrapWithColor("2023 - 2027 | CGPA: 9.37 / 10.0", "#ffffff")}

${this.wrapWithColor("Achievements & Leadership", "#ff8c00")}
- ${this.wrapWithColor("Solved 300+ LeetCode problems", "#ffffff")}
- ${this.wrapWithColor("Finalist at Smart India Hackathon 2024 for FarmLink", "#ffffff")}
- ${this.wrapWithColor("Startup Coordinator, IIIT Ranchi; directed programs impacting 200+ students", "#ffffff")}`;

    const educationDiv = document.createElement("div");
    educationDiv.innerHTML = education;
    outputElement.appendChild(educationDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showSkills(outputElement = this.output) {
    const skills = `<span style="color: #ffff00; font-weight: bold;">Technical Skills</span>

${this.wrapWithColor("Languages", "#ff8c00")}
- TypeScript, JavaScript, Rust, Python, C++, SQL, HTML/CSS

${this.wrapWithColor("Performance & Developer Infrastructure", "#ff8c00")}
- Git graph indexing, LMDB, compact graph snapshots, incremental ingestion, benchmarking, hardware-aware tuning

${this.wrapWithColor("Repository Intelligence & Verification", "#ff8c00")}
- MCP, Tree-sitter, deterministic extraction, snapshot-backed retrieval, evidence receipts, semantic verification

${this.wrapWithColor("Real-Time & Distributed Systems", "#ff8c00")}
- Fastify, WebSockets, Kafka, Redis, PostgreSQL, transactional outbox, queues, resilience controls

${this.wrapWithColor("Product Delivery & Quality", "#ff8c00")}
- React, Next.js, Node.js, AWS, Docker, CI/CD, Vitest, Jest, Playwright, API testing, performance gates

${this.wrapWithColor("Research", "#ff8c00")}
- Graph theory, algorithms, operations research, proof verification, technical writing, LaTeX`;

    const skillsDiv = document.createElement("div");
    skillsDiv.innerHTML = skills;
    outputElement.appendChild(skillsDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showContact(outputElement = this.output) {
    const contact = `<span style="color: #ff8c00; font-weight: bold;">Contact Information</span>

${this.wrapWithColor("Email:", "#ff8c00")} ${this.wrapWithColor('<a href="mailto:deependrarathod898@gmail.com" style="color: #ffffff; text-decoration: none;">deependrarathod898@gmail.com</a>', "#ffffff")}
${this.wrapWithColor("Phone:", "#ff8c00")} ${this.wrapWithColor('<a href="tel:+918005528688" style="color: #ffffff; text-decoration: none;">+91 800 552 8688</a>', "#ffffff")}
${this.wrapWithColor("GitHub:", "#ff8c00")} ${this.wrapWithColor('<a href="https://github.com/Deependra-Codes" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none;">github.com/Deependra-Codes</a>', "#ffffff")}
${this.wrapWithColor("LinkedIn:", "#ff8c00")} ${this.wrapWithColor('<a href="https://in.linkedin.com/in/deependra-rathod-23a6ba381" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none;">in.linkedin.com/in/deependra-rathod-23a6ba381</a>', "#ffffff")}
${this.wrapWithColor("Location:", "#ff8c00")} ${this.wrapWithColor("Ranchi, India", "#ffffff")}
`;

    const contactDiv = document.createElement("div");
    contactDiv.innerHTML = contact;
    outputElement.appendChild(contactDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  closeSplit(terminalContent) {
    const container = terminalContent.parentElement;
    const input = terminalContent.querySelector("input");

    // Remove from terminals array
    const terminalIndex = this.terminals.findIndex((t) => t.input === input);
    if (terminalIndex > -1) {
      this.terminals.splice(terminalIndex, 1);
    }

    // Remove the terminal content
    terminalContent.remove();

    // If container is empty or has only one child, move remaining content up
    if (
      container.children.length <= 1 &&
      container !== this.terminalContainer
    ) {
      if (container.children.length === 1) {
        const remainingContent = container.firstElementChild;
        container.parentElement.insertBefore(remainingContent, container);
      }
      container.remove();
    }

    // Focus the previous terminal
    if (this.terminals.length > 0) {
      const newActiveIndex = Math.min(terminalIndex, this.terminals.length - 1);
      this.terminals[newActiveIndex].input.focus();
      this.activeTerminal = newActiveIndex;
    }
  }

  loadProjects() {
    this.projects = [
      {
        title: "GitGraph Lab",
        description: "Public performance-engineered Rust system for Git history indexing and graph queries.",
        initial: "GG",
        technologies: ["Rust", "LMDB", "CSR Graphs", "Git", "Tauri", "Performance Engineering"],
        impact: "Combines LMDB-backed storage, compact graph snapshots, incremental ingestion, CI, and explicit benchmark and correctness gates.",
      },
      {
        title: "RepoBrain OS",
        description: "Deepest private system: deterministic repository cognition and context infrastructure for coding agents.",
        initial: "RB",
        technologies: ["Rust", "TypeScript", "Python", "MCP", "Tree-sitter", "Semantic Verification"],
        impact: "Builds evidence-backed repository facts, snapshot-aware retrieval, impact analysis, machine-checked contracts, and honest verification-readiness signals.",
      },
      {
        title: "Anchored Unit-Threshold Graph Research",
        description: "Research edge: two manuscripts in progress connecting delivery batching with graph-class theory.",
        initial: "AUT",
        technologies: ["Graph Theory", "Operations Research", "LaTeX", "Proof Verification"],
        impact: "Includes an anchored unit-threshold graph characterization and a linear-time optimization direction on a structured shell case.",
      },
      {
        title: "Communication Platform",
        description: "Private Discord-style event-driven communication system built for reliable real-time workflows.",
        initial: "RTC",
        technologies: ["TypeScript", "Fastify", "WebSockets", "PostgreSQL", "Redis", "Kafka"],
        impact: "Uses a WebSocket gateway, Kafka-compatible workers, transactional outbox, and explicit resilience controls while protecting private implementation details.",
      },
    ];
  }

  loadSkills() {
    this.skills = {
      programming: {
        TypeScript: 92,
        JavaScript: 90,
        Rust: 84,
        Python: 85,
      },
      frameworks: {
        "React.js": 92,
        "Next.js": 90,
        "Node.js": 90,
        Fastify: 84,
      },
      databases: {
        PostgreSQL: 88,
        Redis: 86,
        MongoDB: 84,
        LMDB: 80,
      },
      systems: {
        "Distributed Systems": 86,
        MCP: 84,
        Kafka: 84,
        Docker: 84,
      },
      verification: {
        Vitest: 86,
        "Semantic Verification": 84,
        "Performance Gates": 86,
        "API Testing": 86,
      },
      performanceResearch: {
        "Graph Indexing": 86,
        Benchmarking: 86,
        "Graph Theory": 82,
        "Technical Writing": 86,
      },
    };
  }

  // Theme handling
  handleThemeChange(theme) {
    const nextTheme = this.availableThemes.includes(theme) ? theme : "default";
    this.terminal.className = `terminal theme-${nextTheme}`;
    localStorage.setItem(this.themeStorageKey, nextTheme);
    this.currentTheme = nextTheme;
    document.querySelectorAll(".theme-option").forEach((option) => {
      const isActive = option.dataset.theme === nextTheme;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });
    this.closeModal(this.themeModal);
  }

  // Modal handling
  showModal(modal) {
    modal.classList.add("active");
  }

  closeModal(modal) {
    modal.classList.remove("active");
  }

  // Projects showcase
  showProjects() {
    const container = this.projectsModal.querySelector(".projects-container");
    container.innerHTML = this.projects
      .map(
        (project) => `
      <div class="project-card">
        <div class="project-image project-initial-card">${project.initial}</div>
        <div class="project-details">
          <h3 class="project-title">${project.title}</h3>
          <p class="project-description">${project.description}</p>
          <p class="project-description">${project.impact}</p>
          <div class="project-tech">
            ${project.technologies
              .map(
                (tech) => `
              <span class="tech-tag">${tech}</span>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `
      )
      .join("");
    this.showModal(this.projectsModal);
  }

  // Skills visualization
  showSkillsVisualization() {
    const container = this.skillsModal.querySelector(".skills-container");
    container.innerHTML = Object.entries(this.skills)
      .map(
        ([category, skills]) => `
      <div class="skill-category">
        <h3 class="skill-category-title">${category}</h3>
        <div class="skill-bars">
          ${Object.entries(skills)
            .map(
              ([skill, level]) => `
            <div class="skill-item">
              <div class="skill-info">
                <span class="skill-name">${skill}</span>
                <span class="skill-level">${level}%</span>
              </div>
              <div class="skill-progress">
                <div class="skill-progress-bar" style="width: ${level}%"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
    this.showModal(this.skillsModal);
  }

  // Mini-game - Snake game with p5.js
  initGame() {
    // Clean up any existing game
    this.endGame();

    // Start new game
    this.gameActive = true;

    const outputElement = this.terminals[this.activeTerminal].input
      .closest(".terminal-content")
      .querySelector("[id^='output']");

    const gameContainer = document.createElement("div");
    gameContainer.className = "game-container";
    gameContainer.id = "snake-game-container";
    gameContainer.innerHTML = `
      <div class="game-instructions">
        <p>Snake Game: Use arrow keys to move.</p>
        <p>Press P to pause, SPACE to restart, ESC to exit.</p>
      </div>
      <div id="snake-game-score">Score: 0</div>
      <div id="snake-game-canvas"></div>
    `;

    outputElement.appendChild(gameContainer);

    // Initialize p5.js snake game
    this.initSnakeGame();

    // Scroll to make sure game is visible
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  endGame() {
    if (!this.gameActive) return;

    this.gameActive = false;

    // Remove p5.js instance if it exists
    if (this.p5Instance) {
      this.p5Instance.remove();
      this.p5Instance = null;
    }

    // Remove game container if it exists
    const gameContainer = document.getElementById("snake-game-container");
    if (gameContainer) {
      gameContainer.remove();
    }
  }

  initSnakeGame() {
    const sketch = (p) => {
      // Game variables
      const gridSize = 20;
      const canvasWidth = 400;
      const canvasHeight = 300;
      let snake = [];
      let food;
      let direction = { x: 1, y: 0 };
      let nextDirection = { x: 1, y: 0 };
      let score = 0;
      let gameOver = false;
      let frameRate = 10;
      let isPaused = false;

      p.setup = () => {
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent("snake-game-canvas");
        p.frameRate(frameRate);
        resetGame();
      };

      p.draw = () => {
        p.background(0);

        if (isPaused) {
          drawGrid();
          p.fill(255);
          p.textSize(24);
          p.textAlign(p.CENTER, p.CENTER);
          p.text("PAUSED", canvasWidth / 2, canvasHeight / 2);
          p.textSize(16);
          p.text("Press P to resume", canvasWidth / 2, canvasHeight / 2 + 30);
          return;
        }

        if (gameOver) {
          drawGrid();
          p.fill(255, 0, 0);
          p.textSize(24);
          p.textAlign(p.CENTER, p.CENTER);
          p.text("Game Over!", canvasWidth / 2, canvasHeight / 2 - 20);
          p.textSize(16);
          p.text(`Score: ${score}`, canvasWidth / 2, canvasHeight / 2 + 20);
          p.text(
            "Press SPACE to restart",
            canvasWidth / 2,
            canvasHeight / 2 + 50
          );
          return;
        }

        // Update game state
        direction = nextDirection;
        moveSnake();
        checkCollision();
        checkFood();

        // Draw game
        drawGrid();
        drawSnake();
        drawFood();
        updateScore();
      };

      p.keyPressed = () => {
        if (p.keyCode === 80) {
          // P key for pause
          isPaused = !isPaused;
          return false;
        }

        if (isPaused) return false;

        if (p.keyCode === p.UP_ARROW && direction.y !== 1) {
          nextDirection = { x: 0, y: -1 };
        } else if (p.keyCode === p.DOWN_ARROW && direction.y !== -1) {
          nextDirection = { x: 0, y: 1 };
        } else if (p.keyCode === p.LEFT_ARROW && direction.x !== 1) {
          nextDirection = { x: -1, y: 0 };
        } else if (p.keyCode === p.RIGHT_ARROW && direction.x !== -1) {
          nextDirection = { x: 1, y: 0 };
        } else if (p.keyCode === 32 && gameOver) {
          // SPACE to restart
          resetGame();
        } else if (p.keyCode === 27) {
          // ESC to exit
          this.endGame();
        }

        // Prevent default behavior for arrow keys
        if (
          [
            p.UP_ARROW,
            p.DOWN_ARROW,
            p.LEFT_ARROW,
            p.RIGHT_ARROW,
            32,
            27,
            80,
          ].includes(p.keyCode)
        ) {
          return false;
        }
      };

      function resetGame() {
        snake = [
          { x: 5, y: 5 },
          { x: 4, y: 5 },
          { x: 3, y: 5 },
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        gameOver = false;
        placeFood();
        updateScore();
      }

      function moveSnake() {
        // Create new head
        const head = {
          x: snake[0].x + direction.x,
          y: snake[0].y + direction.y,
        };

        // Wrap around edges
        if (head.x < 0) head.x = Math.floor(canvasWidth / gridSize) - 1;
        if (head.x >= canvasWidth / gridSize) head.x = 0;
        if (head.y < 0) head.y = Math.floor(canvasHeight / gridSize) - 1;
        if (head.y >= canvasHeight / gridSize) head.y = 0;

        // Add new head to beginning of snake
        snake.unshift(head);

        // Remove tail unless food was eaten
        if (head.x !== food.x || head.y !== food.y) {
          snake.pop();
        } else {
          placeFood();
          score += 10;
          // Increase speed slightly with each food
          if (frameRate < 20) {
            frameRate += 0.5;
            p.frameRate(frameRate);
          }
        }
      }

      function checkCollision() {
        // Check if snake collides with itself
        const head = snake[0];
        for (let i = 1; i < snake.length; i++) {
          if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver = true;
            return;
          }
        }
      }

      function checkFood() {
        const head = snake[0];
        if (head.x === food.x && head.y === food.y) {
          placeFood();
          score += 10;
        }
      }

      function placeFood() {
        // Find a position for food that's not occupied by the snake
        let validPosition = false;
        while (!validPosition) {
          food = {
            x: Math.floor(p.random(canvasWidth / gridSize)),
            y: Math.floor(p.random(canvasHeight / gridSize)),
          };

          validPosition = true;
          // Check if food is on snake
          for (const segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
              validPosition = false;
              break;
            }
          }
        }
      }

      function drawSnake() {
        p.noStroke();

        // Draw snake body
        for (let i = 1; i < snake.length; i++) {
          p.fill(0, 255, 0); // Green body
          p.rect(
            snake[i].x * gridSize,
            snake[i].y * gridSize,
            gridSize - 2,
            gridSize - 2,
            4
          );
        }

        // Draw snake head
        p.fill(0, 200, 0); // Darker green head
        p.rect(
          snake[0].x * gridSize,
          snake[0].y * gridSize,
          gridSize - 2,
          gridSize - 2,
          6
        );
      }

      function drawFood() {
        p.fill(255, 0, 0); // Red food
        p.ellipse(
          food.x * gridSize + gridSize / 2,
          food.y * gridSize + gridSize / 2,
          gridSize * 0.8,
          gridSize * 0.8
        );
      }

      function drawGrid() {
        p.stroke(30);
        p.strokeWeight(0.5);

        // Draw vertical lines
        for (let x = 0; x <= canvasWidth; x += gridSize) {
          p.line(x, 0, x, canvasHeight);
        }

        // Draw horizontal lines
        for (let y = 0; y <= canvasHeight; y += gridSize) {
          p.line(0, y, canvasWidth, y);
        }
      }

      function updateScore() {
        const scoreElement = document.getElementById("snake-game-score");
        if (scoreElement) {
          scoreElement.textContent = `Score: ${score}`;
        }
      }
    };

    // Create new p5 instance
    this.p5Instance = new p5(sketch);
  }

  // Matrix rain effect
  startMatrixEffect(outputElement) {
    // Stop any existing matrix effect
    this.stopMatrixEffect();

    // Create canvas for matrix effect
    const matrixContainer = document.createElement("div");
    matrixContainer.className = "matrix-container";
    matrixContainer.id = "matrix-container";

    const canvas = document.createElement("canvas");
    canvas.id = "matrix-canvas";
    matrixContainer.appendChild(canvas);

    const instructions = document.createElement("div");
    instructions.className = "matrix-instructions";
    instructions.textContent = "Type 'stop-matrix' to exit";
    matrixContainer.appendChild(instructions);

    outputElement.appendChild(matrixContainer);

    // Set up canvas
    const ctx = canvas.getContext("2d");
    canvas.width = matrixContainer.offsetWidth;
    canvas.height = 300;

    // Matrix characters
    const characters =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const columns = Math.floor(canvas.width / 20);
    const drops = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -20);
    }

    // Matrix green color in current theme
    const getMatrixColor = () => {
      const themeColors = {
        default: "#00ff00",
        dracula: "#50fa7b",
        solarized: "#859900",
        nord: "#a3be8c",
      };
      return themeColors[this.currentTheme] || "#00ff00";
    };

    // Draw matrix effect
    const drawMatrix = () => {
      // Semi-transparent black to create fade effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = getMatrixColor();
      ctx.font = "15px monospace";

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = characters[Math.floor(Math.random() * characters.length)];

        // Draw character
        ctx.fillText(char, i * 20, drops[i] * 20);

        // Move drop down
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    // Start animation
    this.matrixInterval = setInterval(drawMatrix, 50);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  stopMatrixEffect() {
    if (this.matrixInterval) {
      clearInterval(this.matrixInterval);
      this.matrixInterval = null;
    }

    const matrixContainer = document.getElementById("matrix-container");
    if (matrixContainer) {
      matrixContainer.remove();
    }
  }

  // Calculator command
  calculate(expression, outputElement) {
    if (!expression) {
      this.printToOutput(
        outputElement,
        "Please enter a mathematical expression. Usage: calc [expression]",
        "error"
      );
      return;
    }

    try {
      // Sanitize the expression to prevent code injection
      // Only allow numbers, basic operators, parentheses, and some math functions
      const sanitizedExpression = expression.replace(/[^0-9+\-*/().%\s]/g, "");

      // Evaluate the expression
      const result = eval(sanitizedExpression);

      if (isNaN(result) || !isFinite(result)) {
        throw new Error("Invalid result");
      }

      // Format the result
      const formattedResult =
        typeof result === "number" && !Number.isInteger(result)
          ? result.toFixed(4).replace(/\.?0+$/, "")
          : result.toString();

      const calculation = document.createElement("div");
      calculation.className = "calculation";

      const calculationExpression = document.createElement("div");
      calculationExpression.className = "calculation-expression";
      calculationExpression.textContent = expression;

      const calculationResult = document.createElement("div");
      calculationResult.className = "calculation-result";
      calculationResult.textContent = `= ${formattedResult}`;

      calculation.append(calculationExpression, calculationResult);
      outputElement.appendChild(calculation);
      this.scrollToBottom(outputElement.closest(".terminal-content"));
    } catch (error) {
      this.printToOutput(
        outputElement,
        `Error: Could not evaluate the expression. Make sure it's a valid mathematical expression.`,
        "error"
      );
    }
  }

  // LinkedIn Cover Generator
  generateLinkedInCover(outputElement) {
    // Create container for the LinkedIn cover
    const coverContainer = document.createElement("div");
    coverContainer.className = "linkedin-cover-container";
    coverContainer.style.width = "100%";
    coverContainer.style.height = "300px";
    coverContainer.style.position = "relative";
    coverContainer.style.overflow = "hidden";
    coverContainer.style.borderRadius = "8px";
    coverContainer.style.marginTop = "10px";
    coverContainer.style.marginBottom = "20px";
    coverContainer.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
    coverContainer.style.border = "1px solid rgba(255,255,255,0.1)";

    // Create terminal-like background
    const background = document.createElement("div");
    background.style.position = "absolute";
    background.style.top = "0";
    background.style.left = "0";
    background.style.width = "100%";
    background.style.height = "100%";
    background.style.backgroundColor = "#1e1e2e";
    background.style.zIndex = "1";
    coverContainer.appendChild(background);

    // Add terminal header
    const terminalHeader = document.createElement("div");
    terminalHeader.style.position = "absolute";
    terminalHeader.style.top = "0";
    terminalHeader.style.left = "0";
    terminalHeader.style.width = "100%";
    terminalHeader.style.height = "30px";
    terminalHeader.style.backgroundColor = "#282a36";
    terminalHeader.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
    terminalHeader.style.display = "flex";
    terminalHeader.style.alignItems = "center";
    terminalHeader.style.padding = "0 10px";
    terminalHeader.style.zIndex = "2";

    // Add terminal buttons
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.gap = "6px";

    const colors = ["#ff5f56", "#ffbd2e", "#27c93f"];
    colors.forEach((color) => {
      const button = document.createElement("div");
      button.style.width = "12px";
      button.style.height = "12px";
      button.style.borderRadius = "50%";
      button.style.backgroundColor = color;
      buttonsContainer.appendChild(button);
    });

    terminalHeader.appendChild(buttonsContainer);

    // Add terminal title
    const terminalTitle = document.createElement("div");
    terminalTitle.textContent = "deependra@rathod: ~/interactive-resume";
    terminalTitle.style.color = "#f8f8f2";
    terminalTitle.style.fontSize = "12px";
    terminalTitle.style.fontFamily = "'Fira Code', monospace";
    terminalTitle.style.margin = "0 auto";
    terminalHeader.appendChild(terminalTitle);

    coverContainer.appendChild(terminalHeader);

    // Add terminal content
    const terminalContent = document.createElement("div");
    terminalContent.style.position = "absolute";
    terminalContent.style.top = "30px";
    terminalContent.style.left = "0";
    terminalContent.style.width = "100%";
    terminalContent.style.height = "calc(100% - 30px)";
    terminalContent.style.padding = "15px";
    terminalContent.style.boxSizing = "border-box";
    terminalContent.style.zIndex = "2";
    terminalContent.style.overflow = "hidden";
    coverContainer.appendChild(terminalContent);

    // Add ASCII art
    const asciiArt = document.createElement("pre");
    asciiArt.style.color = "#d4843e";
    asciiArt.style.margin = "0";
    asciiArt.style.fontSize = "10px";
    asciiArt.style.fontFamily = "'Fira Code', monospace";
    asciiArt.style.lineHeight = "1";
    asciiArt.innerHTML = `DEEPENDRA RATHOD`;
    terminalContent.appendChild(asciiArt);

    // Add divider
    const divider = document.createElement("div");
    divider.style.width = "100%";
    divider.style.height = "1px";
    divider.style.backgroundColor = "#555555";
    divider.style.margin = "8px 0";
    terminalContent.appendChild(divider);

    // Add subtitle
    const subtitle = document.createElement("div");
    subtitle.textContent = "Interactive Terminal Resume";
    subtitle.style.color = "#888888";
    subtitle.style.fontSize = "12px";
    subtitle.style.fontFamily = "'Fira Code', monospace";
    subtitle.style.textAlign = "center";
    subtitle.style.marginBottom = "5px";
    terminalContent.appendChild(subtitle);

    // Add role
    const role = document.createElement("div");
    role.textContent = "Systems Engineer | Performance, Repository Intelligence & Reliable Products";
    role.style.color = "#666666";
    role.style.fontSize = "10px";
    role.style.fontFamily = "'Fira Code', monospace";
    role.style.textAlign = "center";
    role.style.marginBottom = "10px";
    terminalContent.appendChild(role);

    // Add another divider
    const divider2 = document.createElement("div");
    divider2.style.width = "100%";
    divider2.style.height = "1px";
    divider2.style.backgroundColor = "#555555";
    divider2.style.margin = "8px 0";
    terminalContent.appendChild(divider2);

    // Add command prompt
    const promptContainer = document.createElement("div");
    promptContainer.style.display = "flex";
    promptContainer.style.alignItems = "center";
    promptContainer.style.marginTop = "10px";

    const prompt = document.createElement("span");
    prompt.textContent = ">";
    prompt.style.color = "#87af87";
    prompt.style.marginRight = "8px";
    prompt.style.fontSize = "14px";
    promptContainer.appendChild(prompt);

    const command = document.createElement("span");
    command.textContent = "help";
    command.style.color = "#f8f8f2";
    command.style.fontFamily = "'Fira Code', monospace";
    command.style.fontSize = "14px";
    promptContainer.appendChild(command);

    terminalContent.appendChild(promptContainer);

    // Add command output preview
    const commandOutput = document.createElement("div");
    commandOutput.style.marginTop = "10px";

    // Create a mini help menu
    const helpTitle = document.createElement("div");
    helpTitle.textContent = "Available Commands";
    helpTitle.style.color = "#ffff00";
    helpTitle.style.fontSize = "12px";
    helpTitle.style.fontWeight = "bold";
    helpTitle.style.marginBottom = "8px";
    commandOutput.appendChild(helpTitle);

    // Add main commands category
    const mainCmdTitle = document.createElement("div");
    mainCmdTitle.textContent = "Main Commands:";
    mainCmdTitle.style.color = "#00ffff";
    mainCmdTitle.style.fontSize = "10px";
    mainCmdTitle.style.marginBottom = "4px";
    commandOutput.appendChild(mainCmdTitle);

    // Add some sample main commands
    const mainCommands = [
      { cmd: "about", desc: "Display professional summary" },
      { cmd: "skills", desc: "View technical expertise" },
      { cmd: "experience", desc: "Show work history" },
    ];

    mainCommands.forEach((item) => {
      const cmdLine = document.createElement("div");
      cmdLine.style.display = "flex";
      cmdLine.style.fontSize = "10px";
      cmdLine.style.marginBottom = "4px";

      const cmdName = document.createElement("span");
      cmdName.textContent = "- " + item.cmd;
      cmdName.style.color = "#98fb98";
      cmdName.style.width = "80px";
      cmdLine.appendChild(cmdName);

      const cmdDesc = document.createElement("span");
      cmdDesc.textContent = item.desc;
      cmdDesc.style.color = "#ffffff";
      cmdLine.appendChild(cmdDesc);

      commandOutput.appendChild(cmdLine);
    });

    // Add utility commands category
    const utilityCmdTitle = document.createElement("div");
    utilityCmdTitle.textContent = "Utility Commands:";
    utilityCmdTitle.style.color = "#00ffff";
    utilityCmdTitle.style.fontSize = "10px";
    utilityCmdTitle.style.marginTop = "8px";
    utilityCmdTitle.style.marginBottom = "4px";
    commandOutput.appendChild(utilityCmdTitle);

    // Add some sample utility commands
    const utilityCommands = [
      { cmd: "game", desc: "Play a mini-game" },
      { cmd: "matrix", desc: "Start Matrix effect" },
    ];

    utilityCommands.forEach((item) => {
      const cmdLine = document.createElement("div");
      cmdLine.style.display = "flex";
      cmdLine.style.fontSize = "10px";
      cmdLine.style.marginBottom = "4px";

      const cmdName = document.createElement("span");
      cmdName.textContent = "- " + item.cmd;
      cmdName.style.color = "#98fb98";
      cmdName.style.width = "80px";
      cmdLine.appendChild(cmdName);

      const cmdDesc = document.createElement("span");
      cmdDesc.textContent = item.desc;
      cmdDesc.style.color = "#ffffff";
      cmdLine.appendChild(cmdDesc);

      commandOutput.appendChild(cmdLine);
    });

    terminalContent.appendChild(commandOutput);

    // Add URL at the bottom
    const urlContainer = document.createElement("div");
    urlContainer.style.position = "absolute";
    urlContainer.style.bottom = "10px";
    urlContainer.style.left = "0";
    urlContainer.style.width = "100%";
    urlContainer.style.textAlign = "center";

    const url = document.createElement("div");
    url.textContent = "deependrarathod898@gmail.com";
    url.style.color = "#87cefa";
    url.style.fontSize = "12px";
    url.style.fontFamily = "'Fira Code', monospace";
    urlContainer.appendChild(url);

    terminalContent.appendChild(urlContainer);

    // Add screenshot instructions
    const instructions = document.createElement("div");
    instructions.innerHTML = "";
    instructions.style.position = "absolute";
    instructions.style.bottom = "10px";
    instructions.style.right = "10px";
    instructions.style.color = "#ffffff";
    instructions.style.opacity = "0.7";
    instructions.style.fontSize = "10px";
    instructions.style.zIndex = "3";
    coverContainer.appendChild(instructions);

    // Append the cover to the output
    outputElement.appendChild(coverContainer);

    // Scroll to make sure the cover is visible
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }
}

// Initialize the terminal
new TerminalResume();
