class CyberTerminal {
    constructor() {
        this.outputElement = document.getElementById('output');
        this.inputElement = document.getElementById('command-input');
        this.pathElement = document.getElementById('current-path');
        this.commandHistory = [];
        this.historyIndex = -1;
        
        // GitHub配置
        this.githubConfig = {
            repo: 'AndWhy666/AndWhy666.github.io',
            branch: 'main',
            token: ''
        };
        
        // 初始文件系统（空）
        this.fileSystem = {
            name: '~',
            type: 'directory',
            children: {}
        };
        
        // 当前目录路径
        this.currentPath = [this.fileSystem];
        
        // 扩展命令列表
        this.commands = {
            'help': this.showHelp.bind(this),
            'clear': this.clearTerminal.bind(this),
            'echo': this.echoText.bind(this),
            'ls': this.listFiles.bind(this),
            'list': this.listFiles.bind(this),
            'cd': this.changeDirectory.bind(this),
            'scp': this.downloadSpecificFile.bind(this),
            'pwd': this.showCurrentDirectory.bind(this)
        };
        
        this.init();
        this.loadGitHubRepo();
    }
    
    init() {
        this.inputElement.addEventListener('keydown', this.handleInput.bind(this));
        this.inputElement.focus();
        this.updatePrompt();
        
        // 添加全局点击聚焦输入框
        document.addEventListener('click', () => {
            this.inputElement.focus();
        });
    }
    
    async loadGitHubRepo() {

        try {
            const fileSystem = await this.fetchGitHubRepoStructure();
            this.fileSystem = fileSystem;
            
            // 重置当前路径到根目录
            this.currentPath = [this.fileSystem];
            this.updatePrompt();
        } catch (error) {
            this.addToOutput(`错误: ${error.message}`, 'error');
            if (error.message.includes('401') || error.message.includes('403')) {
                this.addToOutput('请检查GitHub Token是否正确且有访问权限', 'error');
            }
        }
    }
    
    async fetchGitHubRepoStructure() {
        const { repo, branch, token } = this.githubConfig;
        
        // 首先获取根目录的内容，找到main文件夹
        const rootUrl = `https://api.github.com/repos/${repo}/git/trees/${branch}`;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CyberTerminal'
        };
        
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        
        // 获取根目录
        const rootResponse = await fetch(rootUrl, { headers });
        
        if (!rootResponse.ok) {
            throw new Error(`GitHub API 错误: ${rootResponse.status} ${rootResponse.statusText}`);
        }
        
        const rootData = await rootResponse.json();
        
        // 查找main文件夹
        const mainFolder = rootData.tree.find(item => 
            item.type === 'tree' && item.path.toLowerCase() === 'main'
        );
        
        if (!mainFolder) {
            throw new Error('在仓库中未找到 main 文件夹');
        }
        
        // 获取main文件夹的递归内容
        const mainUrl = `https://api.github.com/repos/${repo}/git/trees/${mainFolder.sha}?recursive=1`;
        const mainResponse = await fetch(mainUrl, { headers });
        
        if (!mainResponse.ok) {
            throw new Error(`GitHub API 错误: ${mainResponse.status} ${mainResponse.statusText}`);
        }
        
        const mainData = await mainResponse.json();
        
        // 将GitHub API响应转换为我们的文件系统结构
        return this.convertGitHubTreeToFileSystem(mainData.tree);
    }
    
    convertGitHubTreeToFileSystem(tree) {
        const root = {
            name: '~',
            type: 'directory',
            children: {}
        };
        
        // 首先创建所有目录
        tree.forEach(item => {
            if (item.type === 'tree') {
                // 目录
                const pathParts = item.path.split('/');
                this.createDirectoryStructure(root, pathParts, item);
            }
        });
        
        // 然后添加文件
        tree.forEach(item => {
            if (item.type === 'blob') {
                // 文件
                const pathParts = item.path.split('/');
                this.addFileToStructure(root, pathParts, item);
            }
        });

        return root;
    }
    
    createDirectoryStructure(root, pathParts, item) {
        let current = root;
        
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            
            if (!current.children[part]) {
                current.children[part] = {
                    name: part,
                    type: 'directory',
                    children: {}
                };
            }
            
            current = current.children[part];
        }
    }
    
    addFileToStructure(root, pathParts, item) {
        let current = root;
        
        // 遍历到文件的父目录
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            current = current.children[part];
        }
        
        // 添加文件
        const fileName = pathParts[pathParts.length - 1];
        current.children[fileName] = {
            name: fileName,
            type: 'file',
            size: this.formatFileSize(item.size || 0),
            sha: item.sha,
            path: item.path
        };
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
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
        
        this.addToOutput(`${this.getPrompt()} ${command}`, 'input');
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
                line.innerHTML = `<span class="prompt">${this.getPrompt()}</span> ${text.replace(`${this.getPrompt()} `, '')}`;
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
    
    getPrompt() {
        const path = this.currentPath.map(node => node.name).join('/');
        return `user@github-term:${path}$`;
    }
    
    updatePrompt() {
        this.pathElement.textContent = this.getPrompt();
    }
    
    getCurrentDirectory() {
        return this.currentPath[this.currentPath.length - 1];
    }
    
    // 命令实现
    showHelp() {
        const helpText = [
            '可用命令:',
            '  clear          - 清空终端',
            '  time           - 显示当前时间',
            '  date           - 显示当前日期',
            '  echo [文本]    - 回显文本',
            '  ls, list       - 列出当前目录内容',
            '  cd [目录]      - 切换目录',
            '  scp [文件名]   - 下载指定文件',
            '  pwd            - 显示当前目录路径'
        ];
        
        helpText.forEach(line => this.addToOutput(line));
    }
    
    clearTerminal() {
        this.outputElement.innerHTML = '';
        this.addToOutput('终端已清空', 'info');
    }
    
    echoText(args) {
        if (args.length > 0) {
            this.addToOutput(args.join(' '));
        } else {
            this.addToOutput('用法: echo [文本]', 'error');
        }
    }
    
    listFiles() {
        const currentDir = this.getCurrentDirectory();
        
        if (currentDir.type !== 'directory') {
            this.addToOutput('错误: 当前路径不是目录', 'error');
            return;
        }
        
        const children = Object.values(currentDir.children);
        
        if (children.length === 0) {
            this.addToOutput('目录为空');
            return;
        }
        
        // 创建文件列表容器
        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        
        children.forEach(item => {
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${item.type}`;
            
            if (item.type === 'directory') {
                fileItem.innerHTML = `<span class="directory">${item.name}/</span>`;
            } else {
                fileItem.innerHTML = `<span class="file">${item.name}</span>`;
                if (item.size) {
                    fileItem.innerHTML += ` <span style="color: #888;">(${item.size})</span>`;
                }
            }
            
            fileList.appendChild(fileItem);
        });
        
        this.outputElement.appendChild(fileList);
    }
    
    changeDirectory(args) {
        if (args.length === 0) {
            // 如果没有参数，回到根目录
            this.currentPath = [this.fileSystem];
            this.updatePrompt();
            this.addToOutput('已切换到主目录');
            return;
        }
        
        const targetDir = args[0];
        const currentDir = this.getCurrentDirectory();
        
        if (currentDir.type !== 'directory') {
            this.addToOutput('错误: 当前路径不是目录', 'error');
            return;
        }
        
        if (targetDir === '..') {
            // 返回上一级目录
            if (this.currentPath.length > 1) {
                this.currentPath.pop();
                this.updatePrompt();
                this.addToOutput(`已切换到目录: ${this.getPrompt()}`);
            } else {
                this.addToOutput('错误: 已经在根目录', 'error');
            }
            return;
        }
        
        // 查找目标目录
        if (currentDir.children[targetDir] && currentDir.children[targetDir].type === 'directory') {
            this.currentPath.push(currentDir.children[targetDir]);
            this.updatePrompt();
            this.addToOutput(`已切换到目录: ${this.getPrompt()}`);
        } else {
            this.addToOutput(`错误: 目录 '${targetDir}' 不存在`, 'error');
        }
    }
    
    async downloadSpecificFile(args) {
        if (args.length === 0) {
            this.addToOutput('用法: scp [文件名]', 'error');
            this.addToOutput('示例: scp README.md', 'info');
            return;
        }

        const filename = args[0];
        const currentDir = this.getCurrentDirectory();

        if (currentDir.type !== 'directory') {
            this.addToOutput('错误: 当前路径不是目录', 'error');
            return;
        }

        // 查找文件
        if (currentDir.children[filename] && currentDir.children[filename].type === 'file') {
            const fileInfo = currentDir.children[filename];
            
            try {
                this.addToOutput(`正在下载: ${filename}`, 'info');
                
                // 构建文件下载URL
                let filePath = fileInfo.path || filename;
                
                // 如果当前不在根目录，需要构建完整路径
                if (this.currentPath.length > 1 && !fileInfo.path) {
                    const pathParts = this.currentPath.slice(1).map(node => node.name);
                    filePath = pathParts.join('/') + '/' + filename;
                }
                
                const downloadUrl = `main/${filePath}`;
                
                // 创建下载链接
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                this.addToOutput(`文件下载已开始: ${filename}`, 'success');
            } catch (error) {
                this.addToOutput(`下载失败: ${error.message}`, 'error');
            }
        } else {
            this.addToOutput(`错误: 文件 '${filename}' 不存在`, 'error');
        }
    }
    
    showCurrentDirectory() {
        const path = this.currentPath.map(node => node.name).join('/');
        this.addToOutput(path);
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