import React, { useRef, useEffect } from "react";
import "./index.css";
const initConfig = `{
  "argument": {
      "appkey": "",
      "ip": "",
      "port": 443,
      "secret": "",
      "enableHTTPS": 1,
      "layout": "2x2",
      "playMode": 0
  },
  "funcName": "init"
}`;
const playConfig = `{
  "argument": {
      "cameraIndexCode": "",
      "ezvizDirect": 0,
      "gpuMode": 0,
      "streamMode": 0,
      "transMode": 1,
      "wndId": -1
  },
  "funcName": "startPreview"
}`;
let oWebControl: any = null;
let bIE = !!window.ActiveXObject || "ActiveXObject" in window;
let pubKey = "";
let initCount = 0;
let iframePos: any = {};
let parentTitle = "";
let iframeClientPos: any = null;
let iframeParentShowSize: any = null;
const HIKVideo = () => {
  const videoRef = useRef<HTMLDivElement>(null);
  const initParamRef = useRef<HTMLTextAreaElement>(null);
  const playParamRef = useRef<HTMLTextAreaElement>(null);
  const cbInfoRef = useRef<HTMLDivElement>(null);
  const initBtnClick = () => {
    var param = initParamRef.current?.value;
    //删除字符串中的回车换行
    param = param?.replace(/(\s*)/g, "");

    // 执行初始化
    requestInterface(param);
  };
  const playBtnClick = () => {
    var param = playParamRef.current?.value;
    //删除字符串中的回车换行
    param = param?.replace(/(\s*)/g, "");

    // 执行初始化
    requestInterface(param);
  };
  const clearBtnClick = () => {
    cbInfoRef.current.html("");
  };

  function setWndCover() {
    if (oWebControl) {
      // 准备要用到的一些数据
      var iframeWndHeight = window.innerHeight; // iframe窗口高度
      var iframeWndWidth = window.innerWidth; // iframe窗口宽度
      var divLeft = videoRef.current.getBoundingClientRect().left;
      var divTop = videoRef.current.getBoundingClientRect().top;
      var divRight = videoRef.current.getBoundingClientRect().right;
      var divBottom = videoRef.current.getBoundingClientRect().bottom;
      var divWidth = videoRef.current.width;
      var divHeight = videoRef.current.height;

      oWebControl.JS_RepairPartWindow(0, 0, 801, 401); // 多1个像素点防止还原后边界缺失一个像素条

      // 判断剪切矩形的上边距
      if (iframeClientPos.top < 0 && Math.abs(iframeClientPos.top) > divTop) {
        var deltaTop = Math.abs(iframeClientPos.top) - divTop;
        oWebControl.JS_CuttingPartWindow(0, 0, 801, deltaTop + 1);
        //console.log({deltaTop: deltaTop});
      }

      // 判断剪切矩形的左边距
      if (
        iframeClientPos.left < 0 &&
        Math.abs(iframeClientPos.left) > divLeft
      ) {
        var deltaLeft = Math.abs(iframeClientPos.left) - divLeft;
        //console.log({deltaLeft: deltaLeft});
        oWebControl.JS_CuttingPartWindow(0, 0, deltaLeft, 401); // 多剪掉一个像素条，防止出现剪掉一部分窗口后出现一个像素条
      }

      // 判断剪切矩形的右边距
      var W1 = iframeWndWidth - divRight;
      var W2 = iframeParentShowSize.width - iframeClientPos.left;
      if (W2 < divWidth) {
        var deltaRight = iframeWndWidth - W2 - W1;
        if (deltaRight > 0) {
          oWebControl.JS_CuttingPartWindow(
            800 - deltaRight,
            0,
            deltaRight + 1,
            401
          );
        }
      }

      // 判断剪切矩形的下边距
      var H1 = iframeClientPos.bottom - iframeParentShowSize.height;
      var H2 = iframeWndHeight - divBottom;
      var deltaBottom = H1 - H2;
      //console.log({deltaBottom: deltaBottom});
      if (deltaBottom > 0) {
        oWebControl.JS_CuttingPartWindow(
          0,
          400 - deltaBottom,
          801,
          deltaBottom + 1
        );
      }
    }
  }

  const initPlugin = () => {
    oWebControl = new window.WebControl({
      szPluginContainer: "playWnd",
      iServicePortStart: 15900,
      iServicePortEnd: 15900,
      szClassId: "23BF3B0A-2C56-4D97-9C03-0CB103AA8F11",
      cbIntegrationCallBack: function () {
        initCount = 0;
        setCallbacks();
        oWebControl
          ?.JS_StartService("window", {
            dllPath: "./VideoPluginConnect.dll",
          })
          .then(() => {
            oWebControl
              .JS_CreateWnd("playWnd", 800, 400, {
                bEmbed: true,
                cbSetDocTitle: function (uuid) {
                  oWebControl._pendBg = false;
                  window.parent.postMessage(
                    {
                      action: "updateTitle",
                      msg: "子页面通知父页面修改title",
                      info: uuid,
                    },
                    "*"
                  ); // '\*'表示跨域参数，请结合自身业务合理设置
                },
              })
              .then(() => {
                // 步骤3：JS_CreateWnd成功后通知父页面将其标题修改回去
                console.log("JS_CreateWnd success");
                window.parent.postMessage(
                  {
                    action: "updateTitle",
                    msg: "子页面通知父页面更新title",
                    info: parentTitle,
                  },
                  "*"
                );

                // 步骤4：发消息更新插件窗口位置：这里不直接更新的原因是，父页面默认可能就存在滚动条，此时有滚动量
                window.parent.postMessage(
                  {
                    action: "updatePos",
                    msg: "更新Pos",
                  },
                  "*"
                );

                initBtnClick();
              });
          });
      },
      cbConnectError: function () {
        console.log("cbConnectError");
        oWebControl = null;
        videoRef.current.innerHTML = "插件未启动，正在尝试启动，请稍候...";
        window.WebControl.JS_WakeUp("VideoWebPlugin://");
        initCount++;
        if (initCount < 3) {
          setTimeout(function () {
            initPlugin();
          }, 3000);
        } else {
          videoRef.current.innerHTML = "插件启动失败，请检查插件是否安装！";
        }
      },
      cbConnectClose: function (bNormalClose) {
        if (true == bNormalClose) {
          console.log("cbConnectClose normal");
        } else {
          console.log("cbConnectClose exception");
        }
        oWebControl = null;
        videoRef.current.innerHTML = "插件未启动，正在尝试启动，请稍候...";
        initCount++;
        if (initCount < 3) {
          setTimeout(function () {
            initPlugin();
          }, 3000);
        } else {
          videoRef.current.innerHTML = "插件启动失败，请检查插件是否安装！";
        }
      },
    });
  };
  const onMessage = function (e) {
    if (e && e.data) {
      switch (e.data.action) {
        case "sendTitle": // 父页面将其标题发送过来，子页面保存该标题，以便创建插件窗口成功后将标题设置回给父页面
          parentTitle = e.data.info;
          break;
        case "updatePos": // 更新插件位置
          var scrollValue = e.data.scrollValue; // 滚动条滚动偏移量
          oWebControl.JS_SetDocOffset({
            left: iframePos.left + scrollValue.left,
            top: iframePos.top + scrollValue.top,
          }); // 更新插件窗口位置

          oWebControl.JS_Resize(800, 400);
          setWndCover();
          break;
        case "scroll":
          iframeParentShowSize = e.data.showSize; // 视窗大小
          iframePos = e.data.iframeOffset; // iframe与文档的偏移量
          iframeClientPos = e.data.iframeClientPos; // iframe相对视窗的位置
          var scrollValue = e.data.scrollValue; // 滚动条滚动偏移量
          if (oWebControl) {
            oWebControl.JS_SetDocOffset({
              left: iframePos.left + scrollValue.left,
              top: iframePos.top + scrollValue.top,
            }); // 更新插件窗口位置
            oWebControl.JS_Resize(800, 400);
            setWndCover();
          }
          break;
        default:
          break;
      }
    }
  };
  // 获取公钥
  function getPubKey(callback: any) {
    oWebControl
      .JS_RequestInterface({
        funcName: "getRSAPubKey",
        argument: JSON.stringify({
          keyLength: 1024,
        }),
      })
      .then(function (oData) {
        console.log(oData);
        if (oData.responseMsg.data) {
          pubKey = oData.responseMsg.data;
          callback();
        }
      });
  }
  // 设置窗口控制回调
  function setCallbacks() {
    oWebControl.JS_SetWindowControlCallback({
      cbIntegrationCallBack: cbIntegrationCallBack,
    });
  }
  function cbIntegrationCallBack(oData) {
    showCBInfo(JSON.stringify(oData.responseMsg), "info");
  }
  function setEncrypt(value) {
    var encrypt = new window.JSEncrypt();
    encrypt.setPublicKey(pubKey);
    return encrypt.encrypt(value);
  }
  function requestInterface(value) {
    oWebControl.JS_RequestInterface(JSON.parse(value)).then(function (oData) {
      console.log(oData);
      showCBInfo(JSON.stringify(oData ? oData.responseMsg : ""), "info");
    });
  }
  function showCBInfo(szInfo, type) {
    if (type === "error") {
      szInfo =
        "<div style='color: red;'>" +
        dateFormat(new Date(), "yyyy-MM-dd hh:mm:ss") +
        " " +
        szInfo +
        "</div>";
    } else {
      szInfo =
        "<div>" +
        dateFormat(new Date(), "yyyy-MM-dd hh:mm:ss") +
        " " +
        szInfo +
        "</div>";
    }
    cbInfoRef.current.html(szInfo + cbInfoRef.current.html());
  }
  function dateFormat(oDate, fmt) {
    var o = {
      "M+": oDate.getMonth() + 1, //月份
      "d+": oDate.getDate(), //日
      "h+": oDate.getHours(), //小时
      "m+": oDate.getMinutes(), //分
      "s+": oDate.getSeconds(), //秒
      "q+": Math.floor((oDate.getMonth() + 3) / 3), //季度
      S: oDate.getMilliseconds(), //毫秒
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (oDate.getFullYear() + "").substr(4 - RegExp.$1.length)
      );
    }
    for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1
            ? o[k]
            : ("00" + o[k]).substr(("" + o[k]).length)
        );
      }
    }
    return fmt;
  }

  useEffect(() => {
    window.addEventListener("message", onMessage);
    initPlugin();
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <>
      <div
        ref={videoRef}
        id="playWnd"
        className="playWnd"
        style={{ left: "109px", top: "133px" }}
      ></div>
      <div id="operate" className="operate">
        <div
          className="module"
          style={{
            left: "30px",
            height: "30px",
            width: "280px",
            padding: "10",
            margin: "10",
          }}
        >
          <div className="item">
            <label>初始化相关参数：</label>
            <textarea
              ref={initParamRef}
              id="initParam"
              type="text"
              style={{ width: "260px", height: "200px" }}
              value={initConfig}
            ></textarea>

            <button
              style={{ width: "10px", padding: "0", margin: "0" }}
              id="initBtn"
              className="btn"
              onClick={initBtnClick}
            >
              执行
            </button>
          </div>
        </div>
        <div
          className="module"
          style={{
            height: "30px",
            width: "280px",
            padding: "10",
            margin: "10",
          }}
        >
          <div className="item">
            <label>播放相关参数：</label>
            <textarea
              ref={playParamRef}
              id="playParam"
              type="text"
              style={{ width: "260px", height: "200px" }}
              value={playConfig}
            ></textarea>
            <button
              style={{ width: "10px", padding: "0", margin: "0" }}
              id="playBtn"
              className="btn"
              onClick={playBtnClick}
            >
              执行
            </button>
          </div>
        </div>
        <div
          className="module"
          style={{
            height: "50px",
            width: "300px",
            padding: "10",
            margin: "10",
          }}
        >
          <legend>返回值信息</legend>
          <div id="cbInfo" className="cbInfo"></div>
          <button
            onClick={clearBtnClick}
            style={{
              width: "80px",
              height: "24px",
              padding: "30",
              margin: "0",
            }}
            id="clear"
          >
            清空
          </button>
        </div>
      </div>
    </>
  );
};
export default HIKVideo;
