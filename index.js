
const fs = require('fs')
const escodegen = require("escodegen");
const esprima = require('esprima');

const srcPath = "./demo/three.js";
const destPath = './demo/three_log.js';
/** 是否显示堆栈信息 */
const isShowStack = false;
let prevHandleTime = 0;

main(srcPath, destPath);

function main(srcPath, destPath) {
    log('读取文件');
    const program = fs.readFileSync(srcPath, "utf-8");
    log('文本转AST');
    let tree = esprima.parseScript(program);
    log('处理AST');
    handleTree(tree);
    log('AST转文本');
    const result = escodegen.generate(tree);
    // console.log(result);
    log('写入新文本');
    fs.writeFileSync(destPath, result);
    log('Finish');
}

function handleTree(tree, methodName = "") {
    if (!tree) return;
    if (checkIsObject(tree)) {
        switch (tree.type) {
            case 'BlockStatement':
                if (tree.body && checkIsArray(tree.body)) {

                    let logStr = '';
                    if (isShowStack) {
                        logStr =
                            `
                                console.groupCollapsed("---------------------------------${methodName}");  
                                console.trace("${methodName}");
                                console.groupEnd(); 
                            `;
                    } else {
                        logStr = `console.log("---------------------------------${methodName}");`;
                    }
                    const consoleBody = esprima.parseScript(logStr).body;
                    if (tree.body.length > 0) {
                        // 空方法不添加log 
                        for (let i = consoleBody.length - 1; i >= 0; i--)
                            tree.body.unshift(consoleBody[i]);
                    }

                    handleTree(tree.body, methodName);
                    return;
                }
                break;
            case 'AssignmentExpression':
                tree.right && handleTree(tree.right, getName(methodName, tree.left));
                break;
            case 'CallExpression':
                if (tree.callee) {
                    handleTree(tree.callee, methodName);
                }
                if (tree.arguments) {
                    handleTree(tree.arguments, methodName);
                }
                break;
            case 'ClassDeclaration':
                tree.body && handleTree(tree.body, getName(methodName, tree));
                break;
            default:
                tree.body && handleTree(tree.body, methodName);
                break;
        }
        return;
    }
    if (checkIsArray(tree)) {
        for (let i = 0; i < tree.length; i++) {
            let item = tree[i];
            switch (item.type) {
                case 'MethodDefinition':
                    if (item.kind === 'get' || item.kind === 'set') {
                        // 过滤 get/set 方法
                    } else {
                        item.value && handleTree(item.value, getName(methodName, item));
                    }
                    break;
                case 'ExpressionStatement':
                    item.expression && handleTree(item.expression, methodName);
                    break;
                case 'ClassDeclaration':
                    item.body && handleTree(item.body, getName(methodName, item));
                    break;
                case 'ForStatement':
                case 'ForInStatement':
                    // for 语句不添加
                    break;
                case 'FunctionDeclaration':
                    // 方法声明
                    item.body && handleTree(item.body, getName(methodName, item));
                    break;
                default:
                    item.body && handleTree(item.body, methodName);
                    break;
            }
        }
        return;
    }
    console.error('什么鬼');
}

function getName(methodName, item) {
    let itemName = '';
    if (item) {
        if (item.id)
            itemName = item.id.name;
        else if (item.key)
            itemName = item.key.name;
        else if (item.property)
            itemName = item.property.name;
    }
    let dot = '';
    if (methodName && itemName)
        dot = '.';
    return methodName + dot + itemName;
}

function checkIsArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
}

function checkIsObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

function getTime() {
    const now = Date.now();
    let result = 0;
    if (prevHandleTime !== 0) {
        result = now - prevHandleTime;
    }
    prevHandleTime = now;
    return '  ' + result + ' ms';
}

function log(str) {
    console.log(str, getTime());
}