const fs = require('fs')
const path = require("path")
const archiver = require('archiver')

const config = JSON.parse(fs.readFileSync(__dirname + '/config.json', "utf-8"))

let jsInstallerCode = fs.readFileSync(__dirname + '/installer.tpl.js', "utf-8")

const url = config.base_url + config.widget_code + '/src/script.js'
const time = (new Date()).getTime()
const installerPath = config.installer_path + '/temp'
const archivePath = config.installer_path
const widgetPath = config.widget_path

console.log('config resolved...')

jsInstallerCode = jsInstallerCode.replace('$${LINK}$$', url)
jsInstallerCode = jsInstallerCode.replace('$${TIME}$$', '?v=' + time)

console.log('js code generated...')

if (!fs.existsSync(installerPath))
    fs.mkdirSync(installerPath, { recursive: true })

fs.writeFileSync(installerPath + '/script.js', jsInstallerCode)
fs.copyFileSync(widgetPath + '/manifest.json', installerPath + '/manifest.json')

copyDir(widgetPath + '/i18n', installerPath + '/i18n')

console.log('lang file done...')

copyDir(widgetPath + '/images', installerPath + '/images')

console.log('images done...')

zipDirectory(installerPath, archivePath + '/widget.zip').then(r => {
    fs.rmdirSync(installerPath, { recursive: true })
    console.log('Done!')
})

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        entry.isDirectory() ?
            copyDir(srcPath, destPath) :
            fs.copyFileSync(srcPath, destPath);
    }
}

function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
        archive
            .directory(source, false)
            .on('error', err => reject(err))
            .pipe(stream)
        ;

        stream.on('close', () => resolve());
        archive.finalize();
    });
}
