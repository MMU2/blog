# 移动端js模拟截屏生成图片并下载功能的实现方案+踩坑过程

### 一. 项目中有需求如下：

将营业日报生成图片下载至用户手机保存

### 二. 踩坑思路：

1. 首先，因为用的是第三方的app（钉钉）内嵌webview开发，所以无法拿到截屏的api（而且需要生成的日报超出一个屏幕范围，截屏也麻烦）
2. 所以，自然想到了使用第三方工具[canvas2html](https://github.com/niklasvh/html2canvas)，将页面中指定范围的dom转换为canvas
3. 随后使用canvas的api`toDataUrl`获得base64格式的图片数据
4. 此时试着直接用a标签下载
```html
`<a href="base64Url" download="name.jpg"></a>`
```
5. 实际证明该方法移动端失效，提示图片下载失败，因为移动端无法直接下载base64格式的图片（据说pc端，chrome可以直接下载，其他浏览器貌似也有兼容写法，有意者可自行验证）
6. 现在只能先将图片传输至后端保存，随后使用服务器地址下载
7. 为了方便后端处理，我们这里不直接上传base64格式的数据，先将base64转换成blob，再模拟一个表单对象，将blob放进去，使用post提交给后端
8. 拿到服务器地址后，再来尝试a标签下载
9. 这里分两种情况，如果图片地址和项目同源，根据网上的说法，点击a标签应该能直接下载成功了，这里没有验证过
10. 我这里因为图片存到了非同源的服务器，所以点击a标签后，无法自动下载，会转跳到默认浏览器打开图片，随后可以长按下载，这里体验就不好了
11. 所以，最后放弃了a标签的方案，变为添加一个弹出层，展示该图片，提示用户长按下载，至此比较完美的实现了该功能

### 三. 实现流程：

html2canvas将页面转换为canvas -> canvas转换dataURL -> base64ToBlob（dataUrl转换为2进制文件流） -> new FormData，将blob放置入该表单对象 -> post请求发送至后端保存图片 -> 后端返回图片地址 -> 使用线上地址展示图片 -> 用户长按保存图片

### 四. 下面逐步说明：

##### 4.1 html2canvas
```javascript
// 安装
npm install html2canvas --save

// 引入
import Html2canvas from 'html2canvas';
Vue.prototype.html2canvas = Html2canvas;

// 使用
this.html2canvas(document.querySelector('#id'))
  .then((canvas) => {
    // todo...
  })
```

##### 4.2 canvas转换dataURL
```javascript
let dataUrl = canvas.toDataURL('image/jpeg');
```

##### 4.3 base64ToBlob
```javascript
/**
 * base64转blob
 * @param {String} code base64个数数据
 * @return {undefined}
 * @author xxx
 */
base64ToBlob (code) {
  let parts = code.split(';base64,');
  let contentType = parts[0].split(':')[1];
  let raw = window.atob(parts[1]);
  let rawLength = raw.length;
  let uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new window.Blob([uInt8Array], {type: contentType, name: 'file_' + new Date().getTime() + '.jpg'});
}

let blob = base64ToBlob(dataUrl);
```

##### 4.3 模拟formData并提交

```javascript
// 新建formData
let formData = new FormData();
// 将blob存入
formData.append('file', blob);
```

此处因为使用的是vue，所以用的axios，提交的时候要注意`content-type`

注意：*创建请求的时候需要新建axios实例去请求，不要使用import进来的axios，不然content-type修改会不成功*

```javascript
import axios from 'axios';
// 创建新的axios实例
let instance = axios.create({});
// 设置content-type为false就行了
instance.defaults.headers.post['Content-Type'] = false;
// 这里特别注意，创建请求的时候，使用这个新创建的实例去进行请求，而不要使用原来的axios
instance({
  method: 'POST',
  data: formData
})
  .then(res => {
    // todo...
  })
```

##### 4.4 使用返回的服务器地址展示图片，让用户长按保存

这里就不用说什么了，自己创建一个遮罩层去实现就行了

### 五. 优化点

1. 因为canvas2html -> 发起请求之间需要走过的步骤比较多，而且如果转换的dom比较复杂，中间的处理事件会比较久，所以在这段时间中要做好相应的loading处理；不然用户点击后，可能会看到1s左右的空窗期，而页面什么提示也没有
2. 生成图片的按钮要做好连续点击限制，避免用户频繁触发

---

以上，功能就全部实现，虽然无法实现点击直接下载，但是也在条件允许的范围内，实现比较好的用户体验了

---

### 六. 最后说一下在ios上面碰到的情况

这个方案在android上面一直测试的比较顺利，但是在ios上面出现过一些疑问

主要就是`canvas.toDataUrl()`这个api失效

当时android顺利调通，在ios上测试的时候，发现js运行到`canvas.toDataUrl()`就停止了，没有返回值也没有什么错误提示

**最后发现是自己添加的水印效果导致在ios执行`canvas.toDataUrl()`的时候无响应（canvas画出水印，转换base64，添加到父级backgroung-image的实现方式），改变了水印实现方式就正常运行了**

下面把整整一天的踩坑过程写下，给各位参考：

刚开始怀疑html2canvas转化出来的canvas有问题，网上看了很多提问，包括github上面html2canvas的issue，有说可能是html2canvas版本问题的，有说可能是canvas画出的图片过大，导致`canvas.toDataUrl()`在ios上运行被系统强行阻止的各种说法，经过测试，都无法解决现在的问题

虽然最后证实了不是上述的问题，但还是将测试结果写下

##### 1. html2canvas版本问题：

npm默认安装的是`"html2canvas": "^1.0.0-alpha.12"`这个alpha版本

随后我测试过最后的正式release版本，`v0.4.1`，证实可以正常运行，但是碰到的无法转换超出屏幕部分的dom，和转换的图片模糊的问题要花太多精力去解决，而且作者说了在旧版本有太多的bug，建议使用新的版本，所以最后放弃了旧版本的尝试

##### 2. canvas画出的图片过大，导致`canvas.toDataUrl()`在ios上运行被系统强行阻止

我转换出来的图片大小在200k左右(用的'image/jpeg'的类型)，没查到网上说的这个极限到底在哪里

当时用自己新建的canvas重新压缩了图片，压缩到只有1kb的时候都如法正常运行`canvas.toDataUrl()`，就基本排除这个问题了


