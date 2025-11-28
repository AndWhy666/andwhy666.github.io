class CyberTerminal {
    constructor() {
        this.outputElement = document.getElementById('output');
        this.inputElement = document.getElementById('command-input');
        this.commandHistory = [];
        this.historyIndex = -1;
        
        this.commands = {
            'help': this.showHelp.bind(this),
            'hello': this.sayHello.bind(this),
            'download': this.downloadFile.bind(this),
            'clear': this.clearTerminal.bind(this),
            'time': this.showTime.bind(this),
            'date': this.showDate.bind(this),
            'echo': this.echoText.bind(this),
            'about': this.showAbout.bind(this),
            'system': this.showSystemInfo.bind(this)
        };
        
        this.init();
    }
    
    init() {
        this.inputElement.addEventListener('keydown', this.handleInput.bind(this));
        this.inputElement.focus();
        
        // 添加全局点击聚焦输入框
        document.addEventListener('click', () => {
            this.inputElement.focus();
        });
    }
    
    handleInput(event) {
        switch(event.key) {
            case 'Enter':
                this.executeCommand();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateHistory(-1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.navigateHistory(1);
                break;
            case 'Tab':
                event.preventDefault();
                this.autoComplete();
                break;
        }
    }
    
    executeCommand() {
        const command = this.inputElement.value.trim();
        if (!command) return;
        
        this.addToOutput(`user@cyber-term:~$ ${command}`, 'input');
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        const [cmd, ...args] = command.split(' ');
        const handler = this.commands[cmd.toLowerCase()];
        
        if (handler) {
            handler(args);
        } else {
            this.addToOutput(`命令未找到: ${cmd}。输入 'help' 查看可用命令。`, 'error');
        }
        
        this.inputElement.value = '';
        this.scrollToBottom();
    }
    
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        this.historyIndex = Math.max(0, Math.min(this.commandHistory.length, this.historyIndex + direction));
        
        if (this.historyIndex === this.commandHistory.length) {
            this.inputElement.value = '';
        } else {
            this.inputElement.value = this.commandHistory[this.historyIndex];
        }
    }
    
    autoComplete() {
        const input = this.inputElement.value.toLowerCase();
        const matches = Object.keys(this.commands).filter(cmd => 
            cmd.startsWith(input)
        );
        
        if (matches.length === 1) {
            this.inputElement.value = matches[0];
        } else if (matches.length > 1) {
            this.addToOutput(`可能的命令: ${matches.join(', ')}`, 'info');
        }
    }
    
    addToOutput(text, type = 'normal') {
        const line = document.createElement('div');
        line.className = 'output-line';
        
        switch(type) {
            case 'input':
                line.innerHTML = `<span class="prompt">user@cyber-term:~$</span> ${text.replace('user@cyber-term:~$ ', '')}`;
                break;
            case 'error':
                line.innerHTML = `<span style="color: #ff4444;">错误:</span> ${text}`;
                break;
            case 'success':
                line.innerHTML = `<span style="color: #44ff44;">成功:</span> ${text}`;
                break;
            case 'info':
                line.innerHTML = `<span style="color: #4488ff;">信息:</span> ${text}`;
                break;
            default:
                line.innerHTML = text;
        }
        
        this.outputElement.appendChild(line);
    }
    
    scrollToBottom() {
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }
    
    // 命令实现
    showHelp() {
        const helpText = [
            '可用命令:',
            '  help     - 显示此帮助信息',
            '  hello    - 打招呼',
            '  download - 下载a.bin文件',
            '  clear    - 清空终端',
            '  time     - 显示当前时间',
            '  date     - 显示当前日期',
            '  echo [文本] - 回显文本',
            '  about    - 关于此终端',
            '  system   - 系统信息'
        ];
        
        helpText.forEach(line => this.addToOutput(line));
    }
    
    sayHello() {
        this.addToOutput('Hello World!', 'success');
        this.addToOutput('欢迎来到 Cyber Terminal！这是一个模拟终端界面的网页应用。', 'info');
    }
    
    downloadFile() {
        // 直接下载同目录下的a.bin文件
        const a = document.createElement('a');
        a.href = 'a.bin';
        a.download = 'a.bin';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.addToOutput('开始下载a.bin文件...', 'success');
        this.addToOutput('如果下载没有开始，请检查a.bin文件是否存在', 'info');
    }
    
    clearTerminal() {
        this.outputElement.innerHTML = '';
        this.addToOutput('终端已清空', 'info');
    }
    
    showTime() {
        const now = new Date();
        this.addToOutput(`当前时间: ${now.toLocaleTimeString()}`, 'info');
    }
    
    showDate() {
        const now = new Date();
        this.addToOutput(`当前日期: ${now.toLocaleDateString()}`, 'info');
    }
    
    echoText(args) {
        if (args.length > 0) {
            this.addToOutput(args.join(' '));
        } else {
            this.addToOutput('用法: echo [文本]', 'error');
        }
    }
    
    showAbout() {
        const aboutText = [
            'Cyber Terminal v2.1.4'
        ];
        
        aboutText.forEach(line => this.addToOutput(line));
    }
    
    showSystemInfo() {
        const info = [
            '系统信息:',
            `用户代理: ${navigator.userAgent}`,
            `语言: ${navigator.language}`,
            `平台: ${navigator.platform}`,
            `在线状态: ${navigator.onLine ? '在线' : '离线'}`,
            `Cookie 启用: ${navigator.cookieEnabled ? '是' : '否'}`,
            `屏幕分辨率: ${screen.width}x${screen.height}`,
            `颜色深度: ${screen.colorDepth} 位`
        ];
        
        info.forEach(line => this.addToOutput(line));
    }
}

// 初始化终端
document.addEventListener('DOMContentLoaded', () => {
    new CyberTerminal();
});

// 保持输入框焦点
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        if (event.key === 'k') {
            event.preventDefault();
            document.getElementById('output').innerHTML = '';
        } else if (event.key === 'l') {
            event.preventDefault();
            document.getElementById('command-input').focus();
        }
    }
});