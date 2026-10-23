// ============================================================
// JAV-JHS-3.3.6.030 功能代码提取
// 提取功能: 弹窗方式打开页面 / 悬浮大图 / 加载女优信息 / 加载长缩略图
//          更高画质预览视频 / 封面快捷按钮(长缩略图、预览视频)
// 说明: 按依赖顺序拼接上述功能的完整相关代码, 已剔除无关代码;
//       宿主类(ListPagePlugin/SettingPlugin)中被截取的方法以 // [节选] 注释标明来源行号。
// 外部依赖(原脚本由油猴@require或站点自带, 本文件未包含):
//   jQuery($), layer, toastify, Viewer(viewerjs), GM_xmlhttpRequest, unsafeWindow
// ============================================================

// ===== [公共] 顶层变量/站点判断/常量/画质表 qualityOptions (源71-142行) =====
var _a, _StorageManager_instances, setItem_fn, saveFilterItem_fn, __defProp = Object.defineProperty, __typeError = msg => {
    throw TypeError(msg);
}, __publicField = (obj, key, value) => ((obj, key, value) => key in obj ? __defProp(obj, key, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: value
}) : obj[key] = value)(obj, "symbol" != typeof key ? key + "" : key, value), __privateMethod = (obj, member, method) => (((obj, member, msg) => {
    member.has(obj) || __typeError("Cannot " + msg);
})(obj, member, "access private method"), method);

const currentHref = window.location.href, isJavDb = currentHref.includes("javdb"), isJavBus = currentHref.includes("javbus") || currentHref.includes("seejav") || currentHref.includes("bus") || currentHref.includes("javsee") || "javbus" === (null == (_a = $(".hidden-xs").attr("alt")) ? void 0 : _a.trim().toLowerCase()), isSearchPage = currentHref.includes("/search?q") || currentHref.includes("/search/") || currentHref.includes("/users/"), Status_FILTER = "filter", Status_FAVORITE = "favorite", Status_HAS_DOWN = "hasDown", Status_HAS_WATCH = "hasWatch", NO = "no", YES = "yes", qualityOptions = [ {
    id: "video-mhb",
    quality: "dmb_w",
    text: "旧视频源-中画质宽版 (404p)",
    canSelect: !1
}, {
    id: "video-mhb",
    quality: "sm_s",
    text: "旧视频源-低画质 (240p)",
    canSelect: !1
}, {
    id: "video-mhb",
    quality: "dm_s",
    text: "旧视频源-中画质 (360p)",
    canSelect: !1
}, {
    id: "video-mhb",
    quality: "dmb_s",
    text: "旧视频源-中画质 (480p)",
    canSelect: !1
}, {
    id: "video-mhb",
    quality: "mhb_w",
    text: "旧视频源-高画质宽版 (404p)",
    canSelect: !1
}, {
    id: "video-mmb",
    quality: "mmb",
    text: "中画质 (432p)",
    canSelect: !0
}, {
    id: "video-mhb",
    quality: "mhb",
    text: "高画质 (576p)",
    canSelect: !0
}, {
    id: "video-hmb",
    quality: "hmb",
    text: "HD (720p)",
    canSelect: !0
}, {
    id: "video-hhb",
    quality: "hhb",
    text: "FullHD (1080p)",
    canSelect: !0
}, {
    id: "video-hhbs",
    quality: "hhbs",
    text: "FullHD (1080p60fps)",
    canSelect: !0
}, {
    id: "video-4k",
    quality: "4k",
    text: "4K (2160p)",
    canSelect: !0
}, {
    id: "video-4ks",
    quality: "4ks",
    text: "4K (2160p60fps)",
    canSelect: !0
} ];

// ===== [公共] StorageManager 设置存储(含getSetting/saveSetting等) (源202-644行) =====
let StorageManager = class _StorageManager {
    constructor() {
        obj = this, (member = _StorageManager_instances).has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
        var obj, member, value;
        __publicField(this, "car_list_key", "car_list");
        __publicField(this, "filter_keyword_title_key", "filter_keyword_title");
        __publicField(this, "filter_keyword_review_key", "filter_keyword_review");
        __publicField(this, "setting_key", "setting");
        __publicField(this, "blacklist_key", "blacklist");
        __publicField(this, "blacklist_car_list_key", "blacklist_car_list");
        __publicField(this, "favorite_actresses_key", "favorite_actresses");
        __publicField(this, "highlighted_tags_key", "highlighted_tags");
        __publicField(this, "forage", localforage.createInstance({
            driver: localforage.INDEXEDDB,
            name: "JAV-JHS",
            version: 1,
            storeName: "appData"
        }));
        __publicField(this, "cacheCarList", null);
        __publicField(this, "cacheBlacklistCarList", null);
        __publicField(this, "cacheFavoriteActressList", null);
        __publicField(this, "cacheSettingObj", null);
        if (_StorageManager.instance) throw new Error("StorageManager已被实例化过了!");
        _StorageManager.instance = this;
    }
    async getCarList() {
        if (this.cacheCarList) return utils.copyObj(this.cacheCarList);
        this.cacheCarList = await this.forage.getItem(this.car_list_key) || [];
        return utils.copyObj(this.cacheCarList);
    }
    async getCar(carNum2) {
        return (await this.getCarList()).find((item => item.carNum.toLowerCase() === carNum2.toLowerCase()));
    }
    _handleSingleCar(carParam, carList) {
        let {carNum: carNum2, url: url, names: names, actionType: actionType, publishTime: publishTime, starId: starId} = carParam;
        if (!carNum2) {
            show.error("番号为空!");
            throw new Error("番号为空!");
        }
        if (!url) {
            show.error("url为空!");
            throw new Error("url为空!");
        }
        url.includes("http") || (url = window.location.origin + url);
        names && (names = names.trim());
        let carData = carList.find((item => item.carNum === carNum2));
        if (carData) {
            names && (carData.names = names);
            url && (carData.url = url);
            publishTime && (carData.publishTime = publishTime);
            carData.updateDate = utils.getNowStr();
        } else {
            let nowStr = utils.getNowStr();
            carData = {
                carNum: carNum2,
                url: url,
                names: names,
                status: "",
                createDate: nowStr,
                updateDate: nowStr,
                publishTime: publishTime
            };
            starId && (carData.starId = starId);
            carList.push(carData);
        }
        switch (actionType) {
          case Status_FILTER:
            if (carData.status === Status_FILTER) {
                const msg2 = `${carNum2} 已在屏蔽列表中`;
                show.error(msg2);
                throw new Error(msg2);
            }
            carData.status = Status_FILTER;
            break;

          case Status_FAVORITE:
            if (carData.status === Status_FAVORITE) {
                const msg2 = `${carNum2} 已在收藏列表中`;
                show.error(msg2);
                throw new Error(msg2);
            }
            carData.status = Status_FAVORITE;
            break;

          case Status_HAS_DOWN:
            carData.status = Status_HAS_DOWN;
            break;

          case Status_HAS_WATCH:
            carData.status = Status_HAS_WATCH;
            break;

          default:
            const msg = "actionType错误, 请联系作者更正: " + actionType;
            show.error(msg);
            throw new Error(msg);
        }
    }
    async saveCar(carData) {
        const carList = await this.forage.getItem(this.car_list_key) || [];
        this._handleSingleCar(carData, carList);
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.car_list_key, carList);
        await this.removeNewVideoList([ carData.carNum ]);
    }
    async updateCarInfo(carParam) {
        let {carNum: carNum2, url: url, names: names, actionType: actionType, publishTime: publishTime, remark: remark} = carParam;
        if (!carNum2) {
            show.error("番号为空!");
            throw new Error("番号为空!");
        }
        if (!url) {
            show.error("url为空!");
            throw new Error("url为空!");
        }
        names && (names = names.trim());
        const carList = await this.forage.getItem(this.car_list_key) || [];
        let carData = carList.find((item => item.carNum === carNum2));
        if (!carData) {
            const msg = "数据不存在: " + carNum2;
            show.error(msg);
            throw new Error(msg);
        }
        carData.names = names;
        carData.url = url;
        carData.remark = remark;
        carData.updateDate = utils.getNowStr();
        switch (actionType) {
          case Status_FILTER:
            carData.status = Status_FILTER;
            break;

          case Status_FAVORITE:
            carData.status = Status_FAVORITE;
            break;

          case Status_HAS_DOWN:
            carData.status = Status_HAS_DOWN;
            break;

          case Status_HAS_WATCH:
            carData.status = Status_HAS_WATCH;
            break;

          default:
            const msg = "actionType错误, 请联系作者更正: " + actionType;
            show.error(msg);
            throw new Error(msg);
        }
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.car_list_key, carList);
    }
    async saveCarList(carRecords) {
        if (!carRecords || !Array.isArray(carRecords) || 0 === carRecords.length) {
            show.error("记录列表为空!");
            throw new Error("记录列表为空!");
        }
        const carList = await this.forage.getItem(this.car_list_key) || [];
        for (const record of carRecords) try {
            this._handleSingleCar(record, carList);
        } catch (error) {
            throw error;
        }
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.car_list_key, carList);
    }
    async removeNewVideoList(carNumList) {
        const favoriteActressesList = await this.getFavoriteActressList();
        let hasAnyListBeenModified = !1;
        const updatedActressList = favoriteActressesList.map((actress => {
            if (!actress.newVideoList || !Array.isArray(actress.newVideoList)) return actress;
            const newFilteredVideoList = actress.newVideoList.filter((carNumString => {
                const isRemoved = carNumList.includes(carNumString);
                if (isRemoved) {
                    clog.log("移除关联女优新作品", actress.name, carNumString);
                    hasAnyListBeenModified = !0;
                }
                return !isRemoved;
            }));
            return {
                ...actress,
                newVideoList: newFilteredVideoList
            };
        }));
        hasAnyListBeenModified && await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.favorite_actresses_key, updatedActressList);
    }
    async removeCar(carNum2) {
        const carList = await this.getCarList(), initialLength = carList.length, updatedList = carList.filter((car => car.carNum !== carNum2));
        if (updatedList.length === initialLength) {
            show.error(`${carNum2} 不存在`);
            return !1;
        }
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.car_list_key, updatedList);
        return !0;
    }
    async batchRemoveCars(carNumList) {
        if (!carNumList || 0 === carNumList.length) throw new Error("未传入参数");
        const carList = await this.getCarList(), initialLength = carList.length, carNumsSet = new Set(carNumList), updatedList = carList.filter((car => !carNumsSet.has(car.carNum))), removedCount = initialLength - updatedList.length;
        if (0 === removedCount) return removedCount;
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.car_list_key, updatedList);
        return removedCount;
    }
    async getBlacklist() {
        return await this.forage.getItem(this.blacklist_key) || [];
    }
    async addBlacklistItem(item) {
        let {starId: starId, name: name2, allName: allName, role: role, movieType: movieType, url: url} = item;
        if (!starId) throw new Error("缺失starId");
        if (!name2) throw new Error("缺失name");
        if (!role) throw new Error("缺失role");
        const blacklist = await this.getBlacklist(), existData = blacklist.find((item2 => item2.starId === starId));
        if (existData) {
            existData.url = url;
            existData.role = role;
            existData.movieType = movieType;
            clog.log("更新黑名单演员信息", existData);
        } else {
            const info = {
                starId: starId,
                name: name2,
                allName: allName || [ name2 ],
                createTime: utils.getNowStr(),
                role: role,
                movieType: movieType,
                url: url
            };
            blacklist.push(info);
            clog.log("增加黑名单演员信息", info);
        }
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.blacklist_key, blacklist);
    }
    async updateBlacklistItem(item) {
        if (!item || !item.starId) throw new Error("参数不全");
        const filterActorActressInfoList = await this.getBlacklist(), waitUpdateObj = filterActorActressInfoList.find((i => i.starId === item.starId));
        if (!waitUpdateObj) throw new Error(`未找到黑名单演员信息:${item.name} ${item.starId}`);
        item.checkTime && (waitUpdateObj.checkTime = item.checkTime);
        item.lastPublishTime && (waitUpdateObj.lastPublishTime = item.lastPublishTime);
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.blacklist_key, filterActorActressInfoList);
    }
    async deleteBlacklistItem(starId) {
        const blacklist = await this.getBlacklist(), updatedList = blacklist.filter((item => item.starId !== starId));
        blacklist.length !== updatedList.length && await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.blacklist_key, updatedList);
    }
    async getBlacklistCarList() {
        if (this.cacheBlacklistCarList && this.cacheBlacklistCarList.length > 0) return utils.deepFreeze(this.cacheBlacklistCarList);
        this.cacheBlacklistCarList = await this.forage.getItem(this.blacklist_car_list_key) || [];
        setTimeout((() => {
            utils.deepFreeze(this.cacheBlacklistCarList);
        }), 0);
        return this.cacheBlacklistCarList;
    }
    async batchSaveBlacklistCarList(carDataList) {
        const carList = await this.getCarList();
        let blacklistCarList = await this.getBlacklistCarList(), hasChanged = !1, copyBlacklistCarList = null, carNumList = [];
        for (const carData of carDataList) {
            let existBlacklistCarData = blacklistCarList.find((item => item.carNum === carData.carNum));
            if (existBlacklistCarData) {
                console.log("已在鉴定记录中", existBlacklistCarData);
                continue;
            }
            let existCarData = carList.find((item => item.carNum === carData.carNum));
            if (existCarData) console.log("已在鉴定记录中", existCarData); else {
                copyBlacklistCarList || (copyBlacklistCarList = utils.copyObj(blacklistCarList));
                this._handleSingleCar(carData, copyBlacklistCarList);
                clog.log(`屏蔽演员番号: <span style="color: #f40">${carData.names} ${carData.carNum}</span>`);
                hasChanged = !0;
                carNumList.push(carData.carNum);
            }
        }
        if (hasChanged) {
            if (!copyBlacklistCarList) throw new Error("程序异常, 黑名单番号数据对象为空!");
            await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.blacklist_car_list_key, copyBlacklistCarList);
            await this.removeNewVideoList(carNumList);
        }
    }
    async removeBlacklistCarList(starId) {
        const filterActorActressCarList = await this.getBlacklistCarList(), newList = filterActorActressCarList.filter((car => car.starId !== starId));
        newList.length !== filterActorActressCarList.length && await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.blacklist_car_list_key, newList);
    }
    async batchRemoveBlacklistCars(carNumList) {
        if (!carNumList || 0 === carNumList.length) throw new Error("未传入参数");
        const blacklistCarList = await this.getBlacklistCarList(), initialLength = blacklistCarList.length, carNumsSet = new Set(carNumList), updatedList = blacklistCarList.filter((car => !carNumsSet.has(car.carNum))), removedCount = initialLength - updatedList.length;
        if (0 === removedCount) return removedCount;
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.blacklist_car_list_key, updatedList);
        return removedCount;
    }
    async getFavoriteActressList() {
        if (this.cacheFavoriteActressList) return utils.copyObj(this.cacheFavoriteActressList);
        this.cacheFavoriteActressList = await this.forage.getItem(this.favorite_actresses_key) || [];
        return utils.copyObj(this.cacheFavoriteActressList);
    }
    async addFavoriteActressList(actressList) {
        const favoriteActressesInfoList = await this.getFavoriteActressList();
        let resultCount = 0;
        for (const actress of actressList) {
            let {starId: starId, name: name2, allName: allName, avatar: avatar, lastCheckTime: lastCheckTime, lastPublishTime: lastPublishTime, actressType: actressType} = actress;
            if (!starId) throw new Error("缺失starId");
            if (!name2) throw new Error("缺失name");
            allName || (allName = [ name2 ]);
            const uncensoredText = "(無碼)";
            if (!actressType) {
                actressType = name2.includes(uncensoredText) || allName.some((element => element.includes(uncensoredText))) ? "uncensored" : "censored";
            }
            name2 = name2.replace(uncensoredText, "");
            allName = allName.map((n => n.replace(uncensoredText, "")));
            let favoriteActresses = favoriteActressesInfoList.find((item => item.starId === starId));
            if (favoriteActresses) {
                if ((!favoriteActresses.avatar || !favoriteActresses.avatar.includes("https")) && avatar) {
                    clog.log(avatar);
                    favoriteActresses.avatar = avatar;
                    clog.log(`<span style="color: #f40">补全女优头像: ${name2}</span>`);
                    resultCount++;
                }
                if (!favoriteActresses.actressType && actressType) {
                    favoriteActresses.actressType = actressType;
                    clog.log(`<span style="color: #f40">补全女优类别: ${name2} ${actressType}</span>`);
                    resultCount++;
                }
                if (favoriteActresses.name.includes(uncensoredText)) {
                    favoriteActresses.name = name2;
                    favoriteActresses.allName = allName;
                    clog.log(`<span style="color: #f40">更正女优名字: ${name2} ${allName}</span>`);
                    resultCount++;
                }
                continue;
            }
            const nowStr = utils.getNowStr();
            favoriteActressesInfoList.push({
                starId: starId,
                name: name2,
                allName: allName,
                avatar: avatar,
                lastCheckTime: lastCheckTime,
                lastPublishTime: lastPublishTime,
                createDate: nowStr,
                updateDate: nowStr,
                actressType: actressType
            });
            clog.log(`<span style="color: #f40">同步JavDB已收藏的演员: ${name2}</span>`);
            resultCount++;
        }
        resultCount > 0 ? await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.favorite_actresses_key, favoriteActressesInfoList) : clog.log("信息已记录, 无需要进行同步收藏的演员");
        return resultCount;
    }
    async removeFavoriteActress(starId) {
        const favoriteActressesInfoList = await this.getFavoriteActressList(), initialLength = favoriteActressesInfoList.length, updatedList = favoriteActressesInfoList.filter((car => car.starId !== starId));
        if (updatedList.length === initialLength) {
            clog.error(`移除演员失败, ${starId} 不存在`);
            return !1;
        }
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.favorite_actresses_key, updatedList);
        return !0;
    }
    async updateFavoriteActress(actress) {
        const favoriteActressesInfoList = await this.getFavoriteActressList(), {starId: starId, name: name2, allName: allName, avatar: avatar, lastCheckTime: lastCheckTime, newVideoList: newVideoList, lastPublishTime: lastPublishTime, actressType: actressType, remark: remark} = actress;
        if (!starId) throw new Error("缺失starId");
        let favoriteActresses = favoriteActressesInfoList.find((item => item.starId === starId));
        if (!favoriteActresses) {
            clog.error("未找到演员信息", starId, name2);
            return !1;
        }
        name2 && (favoriteActresses.name = name2);
        allName && (favoriteActresses.allName = allName);
        avatar && (favoriteActresses.avatar = avatar);
        null != actressType && (favoriteActresses.actressType = actressType);
        lastCheckTime && (favoriteActresses.lastCheckTime = lastCheckTime);
        newVideoList && (favoriteActresses.newVideoList = newVideoList);
        lastPublishTime && (favoriteActresses.lastPublishTime = lastPublishTime);
        remark && (favoriteActresses.remark = remark);
        favoriteActresses.updateDate = utils.getNowStr();
        await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.favorite_actresses_key, favoriteActressesInfoList);
    }
    async getHighlightedTags() {
        return await this.forage.getItem(this.highlighted_tags_key) || [];
    }
    async setHighlightedTags(highlightedTags) {
        return await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.highlighted_tags_key, highlightedTags);
    }
    async saveTitleFilterKeyword(keywords) {
        await __privateMethod(this, _StorageManager_instances, saveFilterItem_fn).call(this, keywords, this.filter_keyword_title_key, "标题关键词");
        if (Array.isArray(keywords)) return null;
        const favoriteActressesList = await this.getFavoriteActressList();
        let hasAnyListBeenModified = !1;
        const updatedActressList = favoriteActressesList.map((actress => {
            if (!actress.newVideoList || !Array.isArray(actress.newVideoList)) return actress;
            const newFilteredVideoList = actress.newVideoList.filter((carNumString => {
                const isRemoved = carNumString.startsWith(keywords);
                if (isRemoved) {
                    clog.log("移除关联女优新作品", actress.name, carNumString);
                    hasAnyListBeenModified = !0;
                }
                return !isRemoved;
            }));
            return {
                ...actress,
                newVideoList: newFilteredVideoList
            };
        }));
        hasAnyListBeenModified && await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.favorite_actresses_key, updatedActressList);
    }
    async getTitleFilterKeyword() {
        return await this.forage.getItem(this.filter_keyword_title_key) || [];
    }
    async getReviewFilterKeywordList() {
        return await this.forage.getItem(this.filter_keyword_review_key) || [];
    }
    async saveReviewFilterKeyword(keywords) {
        return __privateMethod(this, _StorageManager_instances, saveFilterItem_fn).call(this, keywords, this.filter_keyword_review_key, "评论关键词");
    }
    async getSetting(attribute = null, defaultVal) {
        this.cacheSettingObj || (this.cacheSettingObj = await this.forage.getItem(this.setting_key) || {});
        let settingObj = utils.copyObj(this.cacheSettingObj);
        if (null === attribute) return settingObj;
        const value = settingObj[attribute];
        return value ? "true" === value || "false" === value ? "true" === value.toLowerCase() : "string" != typeof value || "" === value.trim() || isNaN(Number(value)) ? value : Number(value) : defaultVal;
    }
    async saveSetting(settingObj) {
        settingObj ? await __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, this.setting_key, settingObj) : show.error("设置对象为空");
    }
    async saveSettingItem(key, value) {
        if (!key) {
            show.error("key 不能为空");
            return;
        }
        let settingObj = await this.getSetting();
        settingObj[key] = value;
        await this.saveSetting(settingObj);
    }
    async importData(jsonData) {
        await this.forage.clear();
        const importPromises = [];
        for (const key in jsonData) {
            const value = jsonData[key], setPromise = __privateMethod(this, _StorageManager_instances, setItem_fn).call(this, key, value);
            importPromises.push(setPromise);
        }
        await Promise.all(importPromises);
    }
    async exportData() {
        const dataMap = {};
        await this.forage.iterate(((value, key) => {
            dataMap[key] = value;
        }));
        if (0 === Object.keys(dataMap).length) throw new Error("没有可导出的数据");
        return dataMap;
    }
};

// ===== [公共] Utils工具类(含openPage/setupEscClose/closePage弹窗方法)+gmHttp网络请求封装 (源1197-1348行) =====
class Utils {
    constructor() {
        __publicField(this, "intervalContainer", {});
        __publicField(this, "mimeTypes", {
            txt: "text/plain",
            html: "text/html",
            css: "text/css",
            csv: "text/csv",
            json: "application/json",
            xml: "application/xml",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
            pdf: "application/pdf",
            doc: "application/msword",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            xls: "application/vnd.ms-excel",
            xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ppt: "application/vnd.ms-powerpoint",
            pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            zip: "application/zip",
            rar: "application/x-rar-compressed",
            "7z": "application/x-7z-compressed",
            mp3: "audio/mpeg",
            wav: "audio/wav",
            mp4: "video/mp4",
            webm: "video/webm",
            ogg: "audio/ogg"
        });
        __publicField(this, "timers", new Map);
        __publicField(this, "insertStyle", (css => {
            if (css) {
                -1 === css.indexOf("<style>") && (css = "<style>" + css + "</style>");
                $("head").append(css);
            }
        }));
        __publicField(this, "layerIndexStack", []);
        Utils.instance || (Utils.instance = this);
        return Utils.instance;
    }
    importResource(url) {
        let tag;
        if (url.indexOf("css") >= 0) {
            tag = document.createElement("link");
            tag.setAttribute("rel", "stylesheet");
            tag.href = url;
        } else {
            tag = document.createElement("script");
            tag.setAttribute("type", "text/javascript");
            tag.src = url;
        }
        document.documentElement.appendChild(tag);
    }
    openPage(url, title, shadeClose, event) {
        if (!url) throw new Error("未传入url");
        shadeClose = shadeClose ?? !0;
        if (event && (event.ctrlKey || event.metaKey)) {
            GM_openInTab(url.includes("http") ? url : window.location.origin + url, {
                insert: 0
            });
            return;
        }
        let finalUrl = url;
        url.includes("/actors/") || url.includes("/star/") || (finalUrl = url.includes("?") ? `${url}&hideNav=1` : `${url}?hideNav=1`);
        layer.open({
            type: 2,
            title: title,
            content: finalUrl,
            scrollbar: !1,
            shadeClose: shadeClose,
            area: this.getResponsiveArea([ "85%", "90%" ]),
            isOutAnim: !1,
            anim: -1,
            success: (layero, index) => {
                this.setupEscClose(index);
            }
        });
    }
    _handleGlobalEscKey(e) {
        if ("Escape" !== e.key && 27 !== e.keyCode) return;
        if (0 === this.layerIndexStack.length) return;
        const topLayerIndex = this.layerIndexStack[this.layerIndexStack.length - 1], $layer = $(`#layui-layer${topLayerIndex}`);
        let viewerExists = !1;
        if ($layer.find(".viewer-container").length > 0) viewerExists = !0; else {
            const iframe = $layer.find(`#layui-layer-iframe${topLayerIndex}`)[0];
            if (iframe && iframe.contentDocument) try {
                $(iframe.contentDocument).find(".viewer-container").length > 0 && (viewerExists = !0);
            } catch (error) {
                clog.warn("无法检查跨域 iframe 内的 .viewer-container");
            }
        }
        if (!viewerExists) {
            this.layerIndexStack.pop();
            layer.close(topLayerIndex);
        }
    }
    setupEscClose(layerIndex) {
        var _a2;
        if (!this._boundHandler) {
            this._boundHandler = this._handleGlobalEscKey.bind(this);
            $(document).off("keydown.globalLayerEsc");
            $(document).on("keydown.globalLayerEsc", this._boundHandler);
        }
        -1 === this.layerIndexStack.indexOf(layerIndex) && this.layerIndexStack.push(layerIndex);
        const $iframe = $(`#layui-layer-iframe${layerIndex}`), eventNamespace = `keydown.layerEsc${layerIndex}`;
        try {
            const iframeDocument = null == (_a2 = $iframe[0]) ? void 0 : _a2.contentDocument;
            if (iframeDocument) {
                if ("yes" === $iframe.attr("data-esc-bound")) return;
                $(iframeDocument).off(eventNamespace);
                $(iframeDocument).on(eventNamespace, this._boundHandler);
                $iframe.attr("data-esc-bound", "yes");
            }
        } catch (e) {
            clog.error("iframe监听失败 (跨域或未加载完毕):", e);
        }
    }
    closePage() {
        storageManager.getSetting("needClosePage", "yes").then((needClosePage => {
            if ("yes" !== needClosePage) return;
            parent.document.documentElement.style.overflow = "auto";
            [ ".layui-layer-shade", ".layui-layer-move", ".layui-layer" ].forEach((function(selector) {
                const elements = parent.document.querySelectorAll(selector);
                if (elements.length > 0) {
                    const elementToRemove = elements.length > 1 ? elements[elements.length - 1] : elements[0];
                    elementToRemove.parentNode.removeChild(elementToRemove);
                }
            }));
            window.close();
        }));
    }
    loopDetector(condition, after, detectInterval = 20, timeout = 1e4, runWhenTimeout = !0) {
        const uuid = Math.random(), start = (new Date).getTime(), stopAndRun = shouldRun => {
            clearInterval(this.intervalContainer[uuid]);
            shouldRun && after && after();
            delete this.intervalContainer[uuid];
        };
        this.intervalContainer[uuid] = setInterval((() => {
            const timeElapsed = (new Date).getTime() - start;
            condition() ? stopAndRun(!0) : timeElapsed >= timeout && stopAndRun(runWhenTimeout);
        }), detectInterval);
    }
    rightClick(container, targetSelector, callback) {
        let containerElement;
        "string" == typeof container ? containerElement = document.querySelector(container) : container instanceof HTMLElement && (containerElement = container);
        if (!containerElement) {
            console.warn("rightClick(), 容器无效或未提供，将使用 document.body 进行全局委托。");
            containerElement = document.body;
        }
        "string" == typeof targetSelector && "" !== targetSelector.trim() ? containerElement.addEventListener("contextmenu", (event => {
            const targetElement = event.target.closest(targetSelector);
            targetElement && callback(event, targetElement);
        })) : console.error("rightClick(), 必须提供有效的 targetSelector。");
    }
    q(event, msg, fun, cancelFun) {
        let x, y;
        if (event) {
            x = event.clientX - 130;
            y = event.clientY - 120;
        } else {
            x = window.innerWidth / 2 - 120;
            y = window.innerHeight / 2 - 120;
        }
        let confirmIndex = layer.confirm(msg, {
            offset: [ y, x ],
            title: "提示",
            btn: [ "确定", "取消" ],
            shade: 0,
            zIndex: 999999991
        }, (function() {
            fun && fun();
            layer.close(confirmIndex);
        }), (function() {
            cancelFun && cancelFun();
        }));
    }
    alert(event, msg, yesFun) {
        let offset;
        event && (offset = [ event.clientX - 200, event.clientY - 120 ]);
        let confirmIndex = layer.alert(msg, {
            offset: offset,
            shade: 0,
            zIndex: 999999991
        }, (function() {
            yesFun && yesFun();
            layer.close(confirmIndex);
        }));
    }
    getNowStr(dateSplitStr = "-", timeSplitStr = ":", dateString = null) {
        let now;
        now = dateString ? new Date(dateString) : new Date;
        const year = now.getFullYear(), month = String(now.getMonth() + 1).padStart(2, "0"), day = String(now.getDate()).padStart(2, "0"), hours = String(now.getHours()).padStart(2, "0"), minutes = String(now.getMinutes()).padStart(2, "0"), seconds = String(now.getSeconds()).padStart(2, "0");
        return `${[ year, month, day ].join(dateSplitStr)} ${[ hours, minutes, seconds ].join(timeSplitStr)}`;
    }
    formatDate(date, dateSplitStr = "-", timeSplitStr = ":") {
        let targetDate;
        if (date instanceof Date) targetDate = date; else {
            if ("string" != typeof date) throw new Error("Invalid date input: must be Date object or date string");
            targetDate = new Date(date);
            if (isNaN(targetDate.getTime())) throw new Error("Invalid date string");
        }
        const year = targetDate.getFullYear(), month = String(targetDate.getMonth() + 1).padStart(2, "0"), day = String(targetDate.getDate()).padStart(2, "0"), hours = String(targetDate.getHours()).padStart(2, "0"), minutes = String(targetDate.getMinutes()).padStart(2, "0"), seconds = String(targetDate.getSeconds()).padStart(2, "0");
        return `${[ year, month, day ].join(dateSplitStr)} ${[ hours, minutes, seconds ].join(timeSplitStr)}`;
    }
    getHourDifference(date1, date2) {
        const timestamp1 = date1.getTime(), timestamp2 = date2.getTime(), differenceInHours = Math.abs(timestamp2 - timestamp1) / 36e5;
        return Math.floor(differenceInHours);
    }
    download(data, fileName) {
        show.info("开始请求下载...");
        const fileExtension = fileName.split(".").pop().toLowerCase();
        let blob, mimeType = this.mimeTypes[fileExtension] || "application/octet-stream";
        if (data instanceof Blob) blob = data; else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) blob = new Blob([ data ], {
            type: mimeType
        }); else if ("string" == typeof data && data.startsWith("data:")) {
            const byteString = atob(data.split(",")[1]), arrayBuffer = new ArrayBuffer(byteString.length), uintArray = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) uintArray[i] = byteString.charCodeAt(i);
            blob = new Blob([ uintArray ], {
                type: mimeType
            });
        } else blob = new Blob([ data ], {
            type: mimeType
        });
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout((() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }), 100);
    }
    smoothScrollToTop(duration = 500) {
        return new Promise((resolve => {
            const start = performance.now(), startPosition = window.pageYOffset;
            window.requestAnimationFrame((function scrollStep(timestamp) {
                const elapsed = timestamp - start, progress = Math.min(elapsed / duration, 1), easeInOutCubic = progress < .5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                window.scrollTo(0, startPosition * (1 - easeInOutCubic));
                progress < 1 ? window.requestAnimationFrame(scrollStep) : resolve();
            }));
        }));
    }
    simpleId() {
        return crypto.randomUUID().replace("-", "");
    }
    isUrl(urlString) {
        try {
            new URL(urlString);
            return !0;
        } catch (_) {
            return !1;
        }
    }
    setHrefParam(key, val) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set(key, val);
        window.history.pushState({}, "", newUrl.toString());
    }
    getUrlParam(url, key) {
        const searchString = url.split("?")[1];
        if (!searchString) return null;
        const regex = new RegExp(`(?:^|&)${key}=([^&]*)`), match = searchString.match(regex);
        let value = "";
        match && match[1] && (value = decodeURIComponent(match[1].replace(/\+/g, " ")));
        return value ? "true" === value || "false" === value ? "true" === value.toLowerCase() : "string" != typeof value || "" === value.trim() || isNaN(Number(value)) ? value : Number(value) : value;
    }
    setUrlParam(url, key, value) {
        if (null == value) {
            const regex2 = new RegExp(`([?&])${key}=[^&]*(&?)`, "i"), match = url.match(regex2);
            if (match) {
                let replacement = match[2] ? match[1] : "";
                "?" === match[1] && "" === match[2] ? replacement = "" : "?" === match[1] && "&" === match[2] ? replacement = "?" : "&" === match[1] && "" === match[2] ? replacement = "" : "&" === match[1] && "&" === match[2] && (replacement = "&");
                return url.replace(regex2, replacement).replace(/([?&])$/, "");
            }
            return url;
        }
        const urlParts = url.split("#"), baseUrl = urlParts[0], hash = urlParts[1] ? `#${urlParts[1]}` : "", encodedValue = encodeURIComponent(String(value)), regex = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        let separator = -1 !== baseUrl.indexOf("?") ? "&" : "?";
        return baseUrl.match(regex) ? baseUrl.replace(regex, "$1" + key + "=" + encodedValue + "$2") + hash : baseUrl + separator + key + "=" + encodedValue + hash;
    }
    reBuildSignature() {
        return javDbApi.buildSignature();
    }
    getResponsiveArea(defaultArea) {
        const screenWidth = window.innerWidth;
        return screenWidth >= 1200 ? defaultArea || this.getDefaultArea() : screenWidth >= 768 ? [ "70%", "90%" ] : [ "95%", "95%" ];
    }
    getDefaultArea() {
        return [ "85%", "90%" ];
    }
    isMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        return [ "iphone", "ipod", "ipad", "android", "blackberry", "windows phone", "nokia", "webos", "opera mini", "mobile", "mobi", "tablet" ].some((keyword => userAgent.includes(keyword)));
    }
    copyToClipboard(type, text) {
        navigator.clipboard.writeText(text).then((() => show.info(`${type}已复制到剪切板, ${text}`))).catch((err => console.error("复制失败: ", err)));
    }
    htmlTo$dom(html) {
        const parser = new DOMParser;
        return $(parser.parseFromString(html, "text/html"));
    }
    addCookie(cookieStr, options = {}) {
        const {maxAge: maxAge = 604800, path: path = "/", domain: domain = "", secure: secure = !1, sameSite: sameSite = "Lax"} = options;
        cookieStr.split(";").forEach((cookie => {
            const trimmed = cookie.trim();
            if (trimmed) {
                const parts = trimmed.split("=");
                if (parts.length >= 2 && parts[0].trim()) {
                    let cookieParts = [ `${parts[0].trim()}=${parts.slice(1).join("=")}` ];
                    maxAge > 0 && cookieParts.push(`max-age=${maxAge}`);
                    cookieParts.push(`path=${path}`);
                    domain && cookieParts.push(`domain=${domain}`);
                    secure && cookieParts.push("Secure");
                    sameSite && cookieParts.push(`SameSite=${sameSite}`);
                    console.log("document.cookie = '" + cookieParts.join("; ") + "'");
                    document.cookie = cookieParts.join("; ");
                }
            }
        }));
    }
    isHidden(el) {
        const element = el.jquery ? el[0] : el;
        return !element || (element.offsetWidth <= 0 && element.offsetHeight <= 0 || "none" === window.getComputedStyle(element).display);
    }
    time(label = "default", unit = "s", precision = 2) {
        if (this.timers.has(label)) {
            const timer = this.timers.get(label), elapsedTime = performance.now() - timer.startTime;
            let formattedTime, unitLabel;
            if ("s" === timer.unit) {
                formattedTime = (elapsedTime / 1e3).toFixed(timer.precision);
                unitLabel = "秒";
            } else {
                formattedTime = elapsedTime.toFixed(timer.precision);
                unitLabel = "毫秒";
            }
            this.timers.delete(label);
            return `${label}: ${formattedTime}${unitLabel}`;
        }
        this.timers.set(label, {
            startTime: performance.now(),
            unit: unit,
            precision: precision
        });
    }
    async sleep(ms = 1e3) {
        return new Promise((resolve => setTimeout(resolve, ms)));
    }
    genericSort(arr, sortRules, emptyLast = !0) {
        if (!Array.isArray(arr) || 0 === arr.length) return [];
        if (!Array.isArray(sortRules) || 0 === sortRules.length) return [ ...arr ];
        const sortedArr = [ ...arr ], safeDateConvert = value => {
            if (value instanceof Date) return value;
            if ("string" == typeof value) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) return date;
            }
            return value;
        };
        return sortedArr.sort(((a, b) => {
            for (const rule of sortRules) {
                const {key: key, order: order = "asc"} = rule;
                let valA = a, valB = b;
                if (null != key) if ("function" == typeof key) {
                    valA = key(a);
                    valB = key(b);
                } else {
                    valA = a && "object" == typeof a ? a[key] : void 0;
                    valB = b && "object" == typeof b ? b[key] : void 0;
                }
                const dateA = safeDateConvert(valA), dateB = safeDateConvert(valB);
                let comparison = 0;
                const aIsNull = null == valA, bIsNull = null == valB;
                if (aIsNull && bIsNull) return 0;
                if (aIsNull) return emptyLast ? 1 : -1;
                if (bIsNull) return emptyLast ? 1 : -1;
                comparison = dateA instanceof Date && dateB instanceof Date ? dateA.getTime() - dateB.getTime() : "number" == typeof valA && "number" == typeof valB ? valA - valB : "string" == typeof valA && "string" == typeof valB ? valA.localeCompare(valB) : String(valA).localeCompare(String(valB));
                "desc" === order && (comparison *= -1);
                if (0 !== comparison) return comparison;
            }
            return 0;
        }));
    }
    async retry(fun, tryCount = 3) {
        var _a2, _b;
        let runCount = 0;
        for (;runCount < tryCount; ) try {
            const result = await fun();
            runCount > 0 && clog.debug(`[重试] 成功，共发起 ${runCount + 1} 次。`);
            return result;
        } catch (e) {
            let errorString = (null == (_b = null == (_a2 = e.response) ? void 0 : _a2.data) ? void 0 : _b.error) || e.message || String(e);
            errorString.startsWith("Error: ") && (errorString = errorString.replace("Error: ", ""));
            if (errorString.includes("Just a moment") || errorString.includes("重定向") || errorString.toLowerCase().includes("404 page not found") || errorString.toLowerCase().includes("已過期") || errorString.toLowerCase().includes("404 not found")) throw e;
            runCount++;
            if (runCount === tryCount) {
                clog.debug(`[重试] 达到最大重试次数 (${tryCount})，最终失败：`, e);
                throw e;
            }
            clog.debug(`[重试] 准备第 ${runCount + 1} 次重试, 错误信息: ${errorString}`);
        }
    }
    copyObj(data) {
        return JSON.parse(JSON.stringify(data));
    }
    deepFreeze(obj) {
        if (null === obj || "object" != typeof obj || Object.isFrozen(obj)) return obj;
        const propNames = Object.getOwnPropertyNames(obj);
        for (const name2 of propNames) {
            const value = obj[name2];
            value && "object" == typeof value && this.deepFreeze(value);
        }
        return Object.freeze(obj);
    }
}


unsafeWindow.utils = window.utils = new Utils;

unsafeWindow.gmHttp = window.gmHttp = new class {
    async get(url, params = {}, headers = {}, noRedirect) {
        return this.gmRequest("GET", url, null, params, headers, noRedirect);
    }
    post(url, data = {}, headers = {}) {
        headers = {
            "Content-Type": "application/json",
            ...headers
        };
        let jsonData = JSON.stringify(data);
        return this.gmRequest("POST", url, jsonData, null, headers);
    }
    postForm(url, data = {}, headers = {}) {
        headers || (headers = {});
        headers["Content-Type"] || (headers["Content-Type"] = "application/x-www-form-urlencoded");
        let body = "";
        data && Object.keys(data).length > 0 && (body = Object.entries(data).map((([key, value]) => `${key}=${value}`)).join("&"));
        return this.gmRequest("POST", url, body, null, headers);
    }
    postFileFormData(url, data = {}, headers = {}) {
        headers || (headers = {});
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
        headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
        let body = "";
        data && Object.keys(data).length > 0 && (body = Object.entries(data).map((([key, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)).join(""));
        body += `--${boundary}--`;
        return this.gmRequest("POST", url, body, null, headers);
    }
    async downloadFileInChunks(url, headers = {}) {
        const httpTimeout = await storageManager.getSetting("httpTimeout", 5e3), httpRetryCount = await storageManager.getSetting("httpRetryCount", 3);
        clog.log("正在获取文件大小...");
        let fileSize, mimeType;
        try {
            const sizeResponse = await utils.retry((() => new Promise(((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: {
                        ...headers,
                        Range: "bytes=0-0"
                    },
                    timeout: httpTimeout,
                    onload: resolve,
                    onerror: e => reject(new Error("网络错误：无法获取文件大小")),
                    ontimeout: () => reject(new Error("超时：获取文件大小"))
                });
            }))), httpRetryCount);
            if (206 !== sizeResponse.status && 200 !== sizeResponse.status) throw new Error(`请求文件大小失败，状态码: ${sizeResponse.status}`);
            {
                const rangeHeader = sizeResponse.responseHeaders.match(/content-range:\s*bytes\s*\d+-\d+\/(\d+)/i), typeHeader = sizeResponse.responseHeaders.match(/content-type:\s*([^\s;]+)/i);
                if (rangeHeader && rangeHeader[1]) fileSize = parseInt(rangeHeader[1], 10); else {
                    if (!sizeResponse.responseHeaders.match(/content-length:\s*(\d+)/i) || 200 !== sizeResponse.status) throw new Error("无法从响应头中获取文件总大小，服务器可能不支持 Range 请求。");
                    {
                        const lengthHeader = sizeResponse.responseHeaders.match(/content-length:\s*(\d+)/i);
                        fileSize = parseInt(lengthHeader[1], 10);
                        clog.warn("服务器返回 200 状态码，可能不支持 Range 请求。将尝试完整下载。");
                    }
                }
                typeHeader && typeHeader[1] && (mimeType = typeHeader[1]);
                clog.log(`文件总大小：${(fileSize / 1024 / 1024).toFixed(2)} MB, MIME 类型: ${mimeType || "未知"}`);
            }
        } catch (e) {
            clog.error("获取文件大小失败:", e.message);
            throw e;
        }
        if (!fileSize || fileSize <= 0) throw new Error("获取到的文件大小无效或服务器拒绝提供大小信息。");
        const numChunks = Math.ceil(fileSize / 1048576), chunkPromises = [], downloadedChunks = new Array(numChunks);
        clog.log(`文件将被分为 ${numChunks} 块进行下载 (每块约 ${1..toFixed(2)} MB)`);
        for (let i = 0; i < numChunks; i++) {
            const start = 1048576 * i, rangeHeader = `bytes=${start}-${Math.min(start + 1048576 - 1, fileSize - 1)}`, chunkPromise = await utils.retry((() => new Promise(((resolve, reject) => {
                const currentHeaders = {
                    ...headers,
                    Range: rangeHeader,
                    Accept: "application/octet-stream"
                };
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: currentHeaders,
                    timeout: httpTimeout,
                    responseType: "arraybuffer",
                    onload: response => {
                        if (206 === response.status || 200 === response.status) if (response.response instanceof ArrayBuffer) {
                            downloadedChunks[i] = response.response;
                            clog.log(`成功下载第 ${i + 1}/${numChunks} 块 (${rangeHeader})`);
                            resolve();
                        } else reject(new Error(`第 ${i + 1} 块响应不是 ArrayBuffer。`)); else reject(new Error(`第 ${i + 1} 块请求失败，状态码: ${response.status}`));
                    },
                    onerror: error => reject(new Error(`第 ${i + 1} 块网络错误: ${error.error}`)),
                    ontimeout: () => reject(new Error(`第 ${i + 1} 块超时。`))
                });
            }))), httpRetryCount);
            chunkPromises.push(chunkPromise);
        }
        try {
            await Promise.all(chunkPromises);
            clog.log("所有分块下载完成，开始合并...");
        } catch (e) {
            clog.error("分块下载过程中发生错误:", e.message);
            throw e;
        }
        const finalBlob = new Blob(downloadedChunks);
        finalBlob.size !== fileSize && clog.warn(`警告：合并后的 Blob 大小 (${finalBlob.size}) 与预期文件大小 (${fileSize}) 不匹配！`);
        return await finalBlob.text();
    }
    async gmRequest(method, url, data = {}, params = {}, headers = {}, noRedirect = !1) {
        if (params && Object.keys(params).length) {
            const queryString = new URLSearchParams(params).toString();
            url += (url.includes("?") ? "&" : "?") + queryString;
        }
        const httpTimeout = await storageManager.getSetting("httpTimeout", 5e3), httpRetryCount = await storageManager.getSetting("httpRetryCount", 3);
        data || (data = void 0);
        return await utils.retry((() => new Promise(((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: headers,
                timeout: httpTimeout,
                data: data,
                onload: response => {
                    try {
                        noRedirect && response.finalUrl !== url && reject("请求被重定向了,URL是:" + response.finalUrl);
                        if (response.status >= 200 && response.status < 300) if (response.responseText) try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            resolve(response.responseText);
                        } else resolve(response.responseText || response); else {
                            clog.error("请求失败,状态码:", response.status, url);
                            if (response.responseText) try {
                                const errorData = JSON.parse(response.responseText);
                                reject(errorData);
                            } catch {
                                reject(new Error(response.responseText || `请求发生错误 ${response.status}`));
                            } else reject(new Error(`请求发生错误 ${response.status}`));
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: error => {
                    clog.error("网络错误:", url);
                    reject(new Error(error.error || "网络错误"));
                },
                ontimeout: () => {
                    reject(new Error("请求超时: " + url));
                }
            });
        }))), httpRetryCount);
    }
};

// ===== [公共] storageManager 全局实例 (源1350行) =====
unsafeWindow.storageManager = window.storageManager = new StorageManager;

// ===== [公共] loading 加载动画 IIFE (源1402-1429行) =====

!function() {
    document.head.insertAdjacentHTML("beforeend", '\n        <style>\n            .loading-container {\n                position: fixed;\n                top: 0;\n                left: 0;\n                width: 100%;\n                height: 100%;\n                display: flex;\n                flex-direction: column; /* 垂直排列 */\n                justify-content: center;\n                align-items: center;\n                background-color: rgba(0, 0, 0, 0.1);\n                z-index: 99999999;\n            }\n    \n            .loading-animation {\n                position: relative;\n                width: 60px;\n                height: 12px;\n                background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);\n                border-radius: 6px;\n                animation: loading-animate 1.8s ease-in-out infinite;\n                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n                margin-bottom: 30px; /* 和按钮之间留出间距 */\n            }\n    \n            .loading-animation:before,\n            .loading-animation:after {\n                position: absolute;\n                display: block;\n                content: "";\n                animation: loading-animate 1.8s ease-in-out infinite;\n                height: 12px;\n                border-radius: 6px;\n                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n            }\n    \n            .loading-animation:before {\n                top: -20px;\n                left: 10px;\n                width: 40px;\n                background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);\n            }\n    \n            .loading-animation:after {\n                bottom: -20px;\n                width: 35px;\n                background: linear-gradient(90deg, #ff9a9e 0%, #fad0c4 100%);\n            }\n            \n            /* 新增按钮样式 */\n            .loading-close-btn {\n                padding: 8px 15px;\n                border: none;\n                border-radius: 4px;\n                background-color: #f44336; /* 红色背景 */\n                color: white;\n                cursor: pointer;\n                font-size: 14px;\n                opacity: 0; /* 默认隐藏 */\n                transition: opacity 0.3s ease; /* 渐变效果 */\n            }\n\n            .loading-close-btn.visible {\n                opacity: 1; /* 3秒后显示 */\n            }\n    \n            @keyframes loading-animate {\n                0% {\n                    transform: translateX(40px);\n                }\n                50% {\n                    transform: translateX(-30px);\n                }\n                100% {\n                    transform: translateX(40px);\n                }\n            }\n        </style>\n    ');
    unsafeWindow.loading = window.loading = function() {
        const container = document.createElement("div");
        container.className = "loading-container";
        const animation = document.createElement("div");
        animation.className = "loading-animation";
        const closeBtn = document.createElement("button");
        closeBtn.className = "loading-close-btn";
        closeBtn.textContent = "关闭";
        closeBtn.addEventListener("click", (() => {
            close();
        }));
        setTimeout((() => {
            closeBtn.classList.add("visible");
        }), 3e3);
        container.appendChild(animation);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
        const close = () => {
            container && container.parentNode && container.parentNode.removeChild(container);
        };
        return {
            close: close
        };
    };
}();

// ===== [公共] show 消息提示(toastify封装) IIFE (源1430-1487行) =====

!function() {
    const showMessage = (msg, type, gravityOrOptions, positionOrOptions, options) => {
        let finalOptions;
        if ("object" == typeof gravityOrOptions) finalOptions = gravityOrOptions; else {
            finalOptions = "object" == typeof positionOrOptions ? positionOrOptions : options || {};
            finalOptions.gravity = gravityOrOptions || "top";
            finalOptions.position = "string" == typeof positionOrOptions ? positionOrOptions : "center";
        }
        finalOptions.gravity && "center" !== finalOptions.gravity || (finalOptions.offset = {
            y: "calc(50vh - 150px)"
        });
        const colors_infoStart = "#60A5FA", colors_infoEnd = "#93C5FD", colors_successStart = "#10B981", colors_successEnd = "#6EE7B7", colors_errorStart = "#EF4444", colors_errorEnd = "#FCA5A5", commonStyles = {
            borderRadius: "12px",
            color: "white",
            padding: "12px 16px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            minWidth: "150px",
            textAlign: "center",
            zIndex: 999999999
        }, defaultConfig = {
            text: msg,
            duration: 1e3,
            close: !1,
            gravity: "top",
            position: "center",
            style: {
                info: {
                    ...commonStyles,
                    background: `linear-gradient(to right, ${colors_infoStart}, ${colors_infoEnd})`
                },
                success: {
                    ...commonStyles,
                    background: `linear-gradient(to right, ${colors_successStart}, ${colors_successEnd})`
                },
                error: {
                    ...commonStyles,
                    background: `linear-gradient(to right, ${colors_errorStart}, ${colors_errorEnd})`
                }
            }[type],
            stopOnFocus: !0,
            oldestFirst: !1,
            ...finalOptions
        };
        -1 === defaultConfig.duration && (defaultConfig.close = !0);
        const toast = Toastify(defaultConfig);
        toast.showToast();
        toast.closeShow = () => {
            toast.toastElement.remove();
        };
        return toast;
    };
    unsafeWindow.show = window.show = {
        ok: (msg, gravityOrOptions = "center", positionOrOptions, options) => showMessage(msg, "success", gravityOrOptions, positionOrOptions, options),
        error: (msg, gravityOrOptions = "center", positionOrOptions, options) => showMessage(msg, "error", gravityOrOptions, positionOrOptions, options),
        info: (msg, gravityOrOptions = "center", positionOrOptions, options) => showMessage(msg, "info", gravityOrOptions, positionOrOptions, options)
    };
}();

// ===== [悬浮大图/长缩略图] viewerjs全屏看图 window.showImageViewer IIFE (源1489-1552行) =====
!function() {
    document.head.insertAdjacentHTML("beforeend", "\n        <style>\n            .viewer-canvas {\n                overflow: auto !important;\n            }\n            \n            .viewer-close {\n                background: rgba(255,0,0,0.6) !important;\n            }\n            .viewer-close:hover {\n                background: rgba(255,0,0,0.8) !important;\n            }\n        </style>\n    ");
    function smartToggleBodyScroll2(waitTime = 10) {
        setTimeout((() => {
            const openLayerCount = document.querySelectorAll(".layui-layer-shade").length;
            document.documentElement.style.overflow = openLayerCount > 0 ? "hidden" : "";
        }), waitTime);
    }
    window.showImageViewer = function(imgUrlOrContainer, altText = "") {
        let $container = null, isTempContainer = !1;
        if ("string" == typeof imgUrlOrContainer || imgUrlOrContainer instanceof String) {
            $container = $('<div class="temporary-container" style="display:none;">').append(`<img src="${imgUrlOrContainer}" alt="${altText}">`).appendTo("body");
            isTempContainer = !0;
        } else $container = $(imgUrlOrContainer);
        const options = {
            zIndex: 999999990,
            navbar: !1,
            zoomOnWheel: !1,
            zoomRatio: .1,
            toggleOnDblclick: !1,
            toolbar: {
                zoomIn: 1,
                zoomOut: 1,
                reset: 1,
                rotateLeft: 0,
                rotateRight: 0,
                flipHorizontal: 0,
                flipVertical: 0
            },
            title: !1,
            keyboard: !1,
            viewed() {
                viewerInstance.zoomTo(1.4);
                let left = (viewerInstance.viewerData.width - viewerInstance.imageData.width) / 2;
                viewerInstance.moveTo(left, 0);
            },
            shown() {
                isTempContainer && $container.remove();
                document.documentElement.style.overflow = "hidden";
                document.body.style.overflow = "hidden";
                viewerInstance.handleKeydown = function(e) {
                    if ("Escape" === e.key || " " === e.key) {
                        e.preventDefault();
                        e.stopPropagation();
                        viewerInstance.destroy();
                        document.removeEventListener("keydown", viewerInstance.handleKeydown);
                        document.documentElement.style.overflow = "";
                        document.body.style.overflow = "";
                        smartToggleBodyScroll2();
                    }
                };
                document.addEventListener("keydown", viewerInstance.handleKeydown);
            },
            hidden() {
                viewerInstance && viewerInstance.handleKeydown && document.removeEventListener("keydown", viewerInstance.handleKeydown);
                viewerInstance.destroy();
                document.documentElement.style.overflow = "";
                document.body.style.overflow = "";
                smartToggleBodyScroll2();
            }
        }, viewerInstance = new Viewer($container[0], options);
        viewerInstance.show();
    };
}();

// ===== [悬浮大图] window.ImageHoverPreview 类 (源1554-1668行) =====
window.ImageHoverPreview = class {
    constructor(options = {}) {
        this.config = {
            selector: ".hover-preview",
            dataAttribute: "data-full",
            maxWidth: 1e3,
            maxHeight: 1e3,
            offsetX: 20,
            offsetY: 20,
            zIndex: 9999999999,
            transition: .2,
            autoAdjustPosition: !0,
            ...options
        };
        this.preview = null;
        this.currentTarget = null;
        this.timer = null;
        this.imgElement = null;
        this.boundElements = new WeakSet;
        this.init();
    }
    init() {
        this.injectStyles();
        this.createPreviewElement();
        this.bindEvents();
    }
    injectStyles() {
        const css = `\n                <style>\n                    .image-hover-preview {\n                        position: fixed;\n                        display: none;\n                        z-index: ${this.config.zIndex};\n                        border-radius: 4px;\n                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n                        overflow: hidden;\n                        pointer-events: none;\n                        opacity: 0;\n                        transition: opacity ${this.config.transition}s ease;\n                        background-color: #fff;\n                    }\n                    \n                    .image-hover-preview.active {\n                        opacity: 1;\n                    }\n                    \n                    .image-hover-preview img {\n                        max-width: ${this.config.maxWidth + "px"};\n                        max-height: ${this.config.maxHeight + "px"};\n                        display: block;\n                        object-fit: contain;\n                    }\n                    \n                    .image-hover-preview::after {\n                        content: '';\n                        position: absolute;\n                        top: 0;\n                        left: 0;\n                        right: 0;\n                        bottom: 0;\n                        background: rgba(0, 0, 0, 0.03);\n                        pointer-events: none;\n                    }\n                    \n                    .image-hover-preview.loading::before {\n                        content: '加载中...';\n                        position: absolute;\n                        top: 50%;\n                        left: 50%;\n                        transform: translate(-50%, -50%);\n                        color: #666;\n                        font-size: 14px;\n                    }\n                </style>\n            `;
        document.head.insertAdjacentHTML("beforeend", css);
    }
    createPreviewElement() {
        this.preview = document.createElement("div");
        this.preview.className = "image-hover-preview";
        document.body.appendChild(this.preview);
    }
    bindEvents() {
        document.querySelectorAll(this.config.selector).forEach((el => {
            if (!this.boundElements.has(el)) {
                el.addEventListener("mouseenter", (e => this.handleMouseEnter(e)));
                el.addEventListener("mouseleave", (e => this.handleMouseLeave(e)));
                el.addEventListener("mousemove", (e => this.handleMouseMove(e)));
                this.boundElements.add(el);
            }
        }));
    }
    handleMouseEnter(e) {
        clearTimeout(this.timer);
        this.currentTarget = e.currentTarget;
        const imgUrl = this.currentTarget.getAttribute(this.config.dataAttribute) || this.currentTarget.src;
        if (!imgUrl) return;
        this.preview.innerHTML = "";
        this.preview.classList.add("loading");
        this.preview.style.display = "block";
        this.preview.classList.remove("active");
        const img = new Image;
        img.onload = () => {
            this.preview.classList.remove("loading");
            this.preview.innerHTML = `<img src="${imgUrl}" alt="预览图">`;
            this.imgElement = this.preview.querySelector("img");
            const {width: width, height: height} = this.calculateImageSize(img);
            this.preview.style.width = `${width}px`;
            this.preview.style.height = `${height}px`;
            this.preview.offsetHeight;
            this.preview.classList.add("active");
            this.handleMouseMove(e);
        };
        img.onerror = () => {
            this.preview.classList.remove("loading");
            this.preview.innerHTML = '<div style="padding:10px;color:#f00;">图片加载失败</div>';
        };
        img.src = imgUrl;
    }
    calculateImageSize(img) {
        let width = img.naturalWidth, height = img.naturalHeight;
        if (width > this.config.maxWidth || height > this.config.maxHeight) {
            const ratio = Math.min(this.config.maxWidth / width, this.config.maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        return {
            width: width,
            height: height
        };
    }
    handleMouseMove(e) {
        if (!this.currentTarget || !this.preview.classList.contains("active")) return;
        let {offsetX: offsetX, offsetY: offsetY} = this.config, left = e.clientX + offsetX, top = e.clientY + offsetY;
        if (this.config.autoAdjustPosition) {
            const previewWidth = this.preview.offsetWidth, previewHeight = this.preview.offsetHeight;
            left + previewWidth > window.innerWidth && (left = e.clientX - previewWidth - offsetX);
            top + previewHeight > window.innerHeight && (top = e.clientY - previewHeight - offsetY);
            left = Math.max(0, left);
            top = Math.max(0, top);
        }
        this.preview.style.left = `${left}px`;
        this.preview.style.top = `${top}px`;
    }
    handleMouseLeave() {
        this.preview.classList.remove("active");
        this.preview.style.display = "none";
        this.currentTarget = null;
        this.imgElement = null;
    }
    destroy() {
        document.querySelectorAll(this.config.selector).forEach((el => {
            if (this.boundElements.has(el)) {
                el.removeEventListener("mouseenter", this.handleMouseEnter);
                el.removeEventListener("mouseleave", this.handleMouseLeave);
                el.removeEventListener("mousemove", this.handleMouseMove);
                this.boundElements.delete(el);
            }
        }));
        this.preview && this.preview.parentNode && this.preview.parentNode.removeChild(this.preview);
    }
};

// ===== [公共] PluginManager + BasePlugin基类(含videoSvg/screenSvg图标、getSelector选择器、getPageInfo) (源2112-2402行) =====
class PluginManager {
    constructor() {
        this.plugins = new Map;
    }
    register(pluginClass) {
        if ("function" != typeof pluginClass) throw new Error("插件必须是一个类");
        const instance = new pluginClass;
        instance.pluginManager = this;
        const lowerName = instance.getName();
        if (this.plugins.has(lowerName)) throw new Error(`插件"${name}"已注册`);
        this.plugins.set(lowerName, instance);
    }
    getBean(name2) {
        return this.plugins.get(name2);
    }
    async processCss() {
        const failedCssLoads = (await Promise.allSettled(Array.from(this.plugins).map((async ([name2, instance]) => {
            try {
                if ("function" == typeof instance.initCss) {
                    const css = await instance.initCss();
                    css && utils.insertStyle(css);
                    return {
                        name: name2,
                        status: "fulfilled"
                    };
                }
                return {
                    name: name2,
                    status: "skipped"
                };
            } catch (e) {
                console.error(`插件 ${name2} 加载 CSS 失败`, e);
                return {
                    name: name2,
                    status: "rejected",
                    error: e
                };
            }
        })))).filter((r => "rejected" === r.status));
        failedCssLoads.length && console.error("以下插件的 CSS 加载失败：", failedCssLoads.map((p => p.value.name)));
    }
    async processPlugins() {
        await Promise.allSettled(Array.from(this.plugins).map((async ([name2, instance]) => {
            try {
                if ("function" == typeof instance.handle) {
                    await instance.handle();
                    return {
                        name: name2,
                        status: "fulfilled"
                    };
                }
            } catch (e) {
                console.error(`插件 ${name2} 执行失败`, e);
                return {
                    name: name2,
                    status: "rejected",
                    error: e
                };
            }
        })));
    }
}

class BasePlugin {
    constructor() {
        __publicField(this, "pluginManager", null);
        __publicField(this, "settingSvg", '<svg t="1760926954860" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4947" width="200" height="200"><path d="M511.099222 365.825763c-80.7786 0-146.26579 65.482515-146.26579 146.259556 0 80.7786 65.48719 146.259556 146.26579 146.259556 80.777041 0 146.259556-65.480957 146.259556-146.259556C657.358779 431.308278 591.876263 365.825763 511.099222 365.825763L511.099222 365.825763zM511.099222 585.215097c-40.391637 0-73.136012-32.742816-73.136012-73.129778 0-40.391637 32.742816-73.129778 73.136012-73.129778 40.386962 0 73.129778 32.738141 73.129778 73.129778C584.229 552.472281 551.486184 585.215097 511.099222 585.215097L511.099222 585.215097zM511.099222 585.215097M900.893017 568.24369l-26.451395-15.268032c3.065451-27.021784 3.138697-54.472139 0.077922-81.822754l26.373473-15.225955c69.953678-40.391637 93.920921-129.844512 53.533959-199.799749-40.390079-69.95212-129.839837-93.925596-199.799749-53.533959l-26.373473 15.225955c-22.153219-16.330888-45.963059-29.99217-70.896534-40.843585l0-30.545416c0-80.777041-65.48719-146.259556-146.26579-146.259556-80.7786 0-146.259556 65.482515-146.259556 146.259556l0 30.515806c-12.377127 5.421811-24.587501 11.55583-36.562551 18.473743-11.97505 6.917913-23.396854 14.420242-34.277879 22.432179l-26.431136-15.258682c-69.958353-40.391637-159.406553-16.424395-199.79819 53.533959C27.378272 326.082437 51.343956 415.535311 121.299193 455.922273l26.449837 15.275825c-3.063892 27.020226-3.137139 54.465905-0.077922 81.822754l-26.373473 15.224397c-69.953678 40.391637-93.920921 129.841395-53.533959 199.799749 40.391637 69.95212 129.839837 93.920921 199.79819 53.533959l26.375032-15.224397c22.153219 16.32933 45.963059 29.984378 70.896534 40.843585l0 30.537624c0 80.7786 65.48719 146.26579 146.26579 146.26579 80.777041 0 146.259556-65.48719 146.259556-146.26579l0-30.515806c12.377127-5.415577 24.587501-11.55583 36.567226-18.467509 11.97505-6.917913 23.398412-14.420242 34.277879-22.432179l26.423343 15.258682c69.959912 40.391637 159.408111 16.418162 199.799749-53.533959C994.813938 698.085085 970.848254 608.635327 900.893017 568.24369L900.893017 568.24369zM891.096666 731.474653c-20.198936 34.982294-64.923035 46.962019-99.900654 26.770875l-63.331869-36.567226 0 0 0 0-7.988562-4.611422c-18.134004 18.450366-39.024886 34.787489-62.516805 48.353705-23.49971 13.559983-48.091888 23.482568-73.129778 29.964118l0 9.222846 0 0 0 65.828489 0 7.301289c0 40.391637-32.742816 73.136012-73.136012 73.136012-40.386962 0-73.129778-32.742816-73.129778-73.136012l0-7.402588 0-65.72719 0 0 0-9.300768c-50.682014-13.090892-97.855981-39.682547-135.652816-78.232109l-7.983886 4.606747 0 0-63.331869 36.567226c-34.977618 20.191144-79.706394 8.206743-99.900654-26.770875-20.192702-34.977618-8.206743-79.701718 26.770875-99.899095l6.341291-3.657657 0 0 64.972905-37.516316c-14.487254-52.005129-13.929333-106.151555 0.073247-156.593569l-8.057133-4.650384 0 0-63.331869-36.567226c-34.982294-20.192702-46.963578-64.923035-26.770875-99.900654 20.192702-34.97606 64.923035-46.962019 99.900654-26.763083l6.324148 3.649866 0 0 64.996282 37.528784c18.132445-18.450366 39.024886-34.790606 62.516805-48.353705 23.493477-13.559983 48.085654-23.485685 73.129778-29.964118l0-9.229079L437.960093 153.739276l0-7.309082c0-40.385404 32.742816-73.129778 73.129778-73.129778 40.391637 0 73.129778 32.744375 73.129778 73.129778l0 7.404147 0 65.72719 0 9.307001c50.686689 13.086217 97.862215 39.684106 135.657491 78.232109l48.487732-27.997368 22.828023-13.176607c34.977618-20.192702 79.701718-8.212977 99.89442 26.763083 20.198936 34.982294 8.212977 79.706394-26.764641 99.900654l-30.822819 17.79738-32.50905 18.769847 0 0 0 0-7.983886 4.605189c14.488813 52.009805 13.929333 106.159347-0.077922 156.599803l64.979139 37.511641 0 0 6.414537 3.701294C899.303409 651.772936 911.289368 696.498594 891.096666 731.474653L891.096666 731.474653zM891.096666 731.474653M197.330785 324.240361c-1.932465 3.232203-3.824411 6.497135-5.649343 9.785442L197.330785 324.240361 197.330785 324.240361zM197.330785 324.240361M830.515443 690.133926l-5.655577 9.804144C826.793889 696.699632 828.685835 693.433143 830.515443 690.133926L830.515443 690.133926zM830.515443 690.133926M505.297151 146.430195l11.304921 0C512.835324 146.369416 509.067017 146.374091 505.297151 146.430195L505.297151 146.430195zM505.297151 146.430195M516.898176 877.740444l-11.31583 0C509.350653 877.796547 513.125193 877.796547 516.898176 877.740444L516.898176 877.740444zM516.898176 877.740444" fill="#272636" p-id="4948"></path></svg>');
        __publicField(this, "editSvg", '<svg t="1760920692801" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3545" width="200" height="200"><path d="M1013.929675 128.26571a143.759824 143.759824 0 0 1 10.44409 53.858738 84.576649 84.576649 0 0 1-5.836403 30.308339 92.870485 92.870485 0 0 1-18.635533 29.284408 1314.726599 1314.726599 0 0 1-24.983901 24.574329c-7.372299 7.06512-13.82306 13.311095-19.249891 18.737926-6.143582 6.143582-12.082378 11.672806-17.406817 16.382886L720.266444 82.598415c9.317766-8.601015 20.478607-18.942712 33.277737-31.02509s23.448006-21.604931 31.946628-28.67005a102.085858 102.085858 0 0 1 68.193763-22.731255c11.263234 0.307179 22.116896 2.047861 32.560985 5.222045 10.546483 3.071791 19.659463 6.655547 27.441334 10.546483 16.280493 8.601015 34.301667 23.550399 54.063524 45.052936 19.864249 21.502538 35.120812 43.82422 46.076867 67.272226z m-907.20231 570.943576l32.560986-33.38013c17.099637-17.509209 38.397389-39.216533 64.098041-64.917186l84.986221-85.395793 94.303987-94.815953 250.350976-251.477299L850.817567 389.163169 600.46659 640.640468l-93.177663 94.815953c-31.02509 30.410732-58.978389 58.364031-83.859898 83.655111-24.779115 25.29108-45.360116 46.17926-61.743001 62.562146a504.797674 504.797674 0 0 1-55.804206 50.274981c-10.239304 7.884264-20.581 14.130239-31.537055 18.737926a507.152714 507.152714 0 0 1-47.715156 19.86425 1609.311367 1609.311367 0 0 1-131.063087 42.185931c-20.478607 5.426831-35.837563 8.908194-45.974474 10.546483-20.88818 2.35504-34.813633-0.819144-41.981145-9.42016-6.860333-8.601015-8.805801-22.93604-5.73401-43.312254a396.261054 396.261054 0 0 1 11.058448-47.305584c5.836403-20.683394 12.082378-42.185931 18.635532-64.40522 6.553154-22.219289 13.003916-42.697897 19.249891-61.435822 6.143582-18.635533 11.263234-31.537055 15.15417-38.602176 4.607687-10.853662 9.829732-20.785787 15.666135-29.796373a192.49891 192.49891 0 0 1 25.086294-29.796374z" fill="#FF9500" p-id="3546"></path></svg>');
        __publicField(this, "deleteSvg", '<svg t="1760921450746" class="jhs-icon icon" viewBox="0 0 1194 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4530" width="200" height="200"><path d="M761.086847 36.028779s309.754321-147.538628 424.952209 231.50509c2.047962 6.570546 71.337359 253.862013-220.838618 415.139055-12.970429 7.167869-267.515096 145.746661-370.339877 341.327076 0 0-90.963666-205.649563-393.379455-351.566888-6.399883-3.071944-304.549083-156.583796-163.751664-487.2444 3.669266-8.533177 163.666333-336.20717 466.423449-99.411511l24.575549 27.391498L387.931021 324.279495l237.648977 159.570408-109.139333 145.746661L625.579998 849.069874l-30.719437-205.820227 166.226286-169.81022-216.486698-168.103585L761.086847 36.028779z" fill="#F4382E" p-id="4531"></path></svg>');
        __publicField(this, "checkSvg", '<svg t="1760921633527" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5603" width="200" height="200"><path d="M924.928 544A413.76 413.76 0 0 1 544 924.736v3.264h-64v-3.2A413.696 413.696 0 0 1 99.072 544H96v-64h3.072A413.696 413.696 0 0 1 480 99.2V96h64v3.2a413.76 413.76 0 0 1 380.928 380.8h3.072v64h-3.072z m-64-64A350.016 350.016 0 0 0 544 163.2V288h-64V163.2A350.016 350.016 0 0 0 163.072 480H288v64H163.072A350.016 350.016 0 0 0 480 860.8V736h64v124.8a350.016 350.016 0 0 0 316.928-316.8H736v-64h124.928zM512 544a32 32 0 1 1 32-32 32 32 0 0 1-32 32z" fill="#333333" p-id="5604"></path></svg>');
        __publicField(this, "actressSvg", '<svg t="1760926744637" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1948" width="200" height="200"><path d="M265.950168 668.467036V209.809493A209.809493 209.809493 0 0 1 475.759661 0h40.949536A209.809493 209.809493 0 0 1 726.564189 209.809493v440.435" p-id="1949"></path><path d="M916.558657 825.861124a193.463804 193.463804 0 0 0-137.442564-155.83573l-186.001889-45.795231-10.487631-124.293214H424.106373L412.231008 624.025416l-170.623063 44.44162a193.452429 193.452429 0 0 0-133.666108 154.698244L76.410695 1023.192384h871.189985z" fill="#FFE7D9" p-id="1950"></path><path d="M668.472724 265.682859c68.431223-29.187919 96.140409 100.349111 5.20969 151.774902z" fill="#FFCFB5" p-id="1951"></path><path d="M676.378259 334.421203c1.137487-99.814492-38.674561-172.158671-38.674561-172.15867l-59.740822 11.920865a493.805894 493.805894 0 0 1-80.761583 9.099896 493.669396 493.669396 0 0 1-80.761583-9.099896l-59.683948-11.88674s-39.812048 72.344179-38.776934 172.15867l-1.080613 92.05683c5.209691 56.271486 92.4777 121.381247 195.022161 119.163147 61.196805 0.034125 165.59537-51.573665 165.59537-119.197272z" fill="#FFE7D9" p-id="1952"></path><path d="M322.198905 274.703131c-68.419848-29.187919-96.140409 100.349111-5.209691 151.774902z" fill="#FFCFB5" p-id="1953"></path><path d="M297.390311 812.461526H742.034014a38.458438 38.458438 0 0 1 38.458438 38.458439V1020.325917H258.931873V850.90859a38.458438 38.458438 0 0 1 38.458438-38.447064z" fill="#FFD527" p-id="1954"></path><path d="M690.539973 92.284327c-20.645391 84.287793-275.613121 235.323328-424.589805 117.525166l104.955934-95.548915 139.399042-64.529643z" p-id="1955"></path><path d="M285.321573 383.708519h33.624119v177.118114h-33.624119zM675.855015 383.708519h33.624118v177.118114h-33.624118z" fill="#FFD527" p-id="1956"></path></svg>');
        __publicField(this, "newSvg", '<svg t="1760926857487" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3954" width="200" height="200"><path d="M508.330667 733.994667c-11.008-7.338667-13.44-17.109333-7.338667-29.333334 28.117333-37.888 41.557333-98.986667 40.341333-183.317333v-165.013333c0-14.656 7.338667-23.210667 21.994667-25.664 37.888-1.216 82.496-5.504 133.845333-12.842667 13.44-2.432 21.376 3.072 23.829334 16.512 1.216 12.224-4.266667 19.562667-16.512 21.994667a1787.093333 1787.093333 0 0 1-113.664 11.008c-6.101333 0-9.173333 3.669333-9.173334 10.986666v84.330667h135.68c12.224 1.237333 18.944 7.957333 20.16 20.181333-1.216 10.986667-7.936 17.109333-20.16 18.346667h-36.672v223.658667c-1.216 12.202667-7.936 18.944-20.16 20.16-11.008-1.216-17.109333-7.957333-18.346666-20.16V501.162667h-60.48v18.346666c1.216 92.885333-13.44 161.92-44.010667 207.146667-6.101333 12.224-15.893333 14.677333-29.333333 7.338667z m-131.989334-282.325334c-1.237333 0-2.453333 0.618667-3.669333 1.834667h45.824a522.666667 522.666667 0 0 0 16.512-31.168c7.317333-12.224 12.224-20.778667 14.656-25.664 6.122667-11.008 15.274667-14.677333 27.52-11.008 9.770667 6.122667 12.202667 14.058667 7.317333 23.829333-4.906667 9.792-13.44 24.448-25.664 44.010667h49.493334c9.770667 1.216 15.274667 6.72 16.512 16.490667-1.237333 11.008-6.741333 17.109333-16.512 18.346666h-82.496a12.437333 12.437333 0 0 1 3.669333 9.173334v38.485333h69.653333c9.792 1.216 15.296 6.72 16.512 16.490667-1.216 11.008-6.72 17.130667-16.512 18.346666h-69.653333v108.16c0 34.218667-15.274667 51.946667-45.845333 53.162667h-16.490667a195.157333 195.157333 0 0 1-20.16 1.834667c-12.224 0-19.562667-6.72-22.016-20.16 1.237333-12.224 7.338667-18.944 18.346667-20.16 2.432 0 6.101333 0.597333 10.986666 1.834666h11.008c15.893333 0 23.829333-8.554667 23.829334-25.685333v-98.986667H314.026667c-11.008-1.216-17.109333-7.338667-18.346667-18.346666 1.237333-9.770667 7.338667-15.274667 18.346667-16.490667h75.157333V497.493333c0-3.669333 1.216-6.72 3.669333-9.173333h-89.813333c-11.029333-1.216-17.130667-7.317333-18.346667-18.325333 1.216-9.770667 7.317333-15.274667 18.346667-16.490667h56.810667c-3.669333-1.216-6.72-4.266667-9.173334-9.173333-1.216-1.216-3.050667-4.266667-5.482666-9.173334a758.336 758.336 0 0 0-14.677334-23.829333c-4.885333-9.770667-3.050667-17.706667 5.504-23.829333 11.008-3.669333 19.562667-1.216 25.664 7.338666 2.453333 2.432 6.122667 7.338667 11.008 14.656 6.101333 8.554667 9.770667 14.08 10.986667 16.512 4.906667 9.770667 2.453333 18.346667-7.317333 25.664z m-60.501333-71.509333c-9.792-1.216-15.274667-7.317333-16.512-18.346667 1.237333-9.749333 6.72-15.253333 16.512-16.490666h75.157333c-3.669333-12.202667-7.338667-21.973333-10.986666-29.333334-1.237333-12.202667 3.648-19.541333 14.656-21.973333 12.224-2.453333 21.397333 1.216 27.52 10.986667 0 1.216 0.597333 3.669333 1.813333 7.338666 4.906667 15.872 9.173333 26.88 12.842667 32.981334h60.48c11.008 1.237333 17.130667 6.741333 18.346666 16.512-1.216 11.008-7.338667 17.109333-18.346666 18.346666h-181.482667z m-14.677333 311.68c-8.533333-6.122667-10.986667-14.08-7.338667-23.829333a1659.648 1659.648 0 0 0 33.002667-66.005334c4.906667-9.792 12.224-12.842667 22.016-9.173333 9.770667 4.906667 13.44 12.224 10.986666 21.994667-3.669333 6.122667-9.173333 17.728-16.490666 34.837333-8.554667 15.893333-14.677333 27.52-18.346667 34.837333-4.885333 8.554667-12.821333 11.008-23.829333 7.338667z m201.664-25.664c-9.770667 4.885333-18.346667 2.432-25.664-7.338667a1138.56 1138.56 0 0 1-27.498667-44.010666c-4.885333-8.533333-3.050667-16.490667 5.504-23.829334 9.770667-3.669333 18.346667-1.216 25.664 7.338667l14.677333 21.994667c6.101333 9.770667 10.389333 17.109333 12.821334 21.994666 4.906667 8.554667 3.050667 16.512-5.504 23.850667z" fill="#333333" p-id="3955"></path><path d="M675.328 117.717333A425.429333 425.429333 0 0 0 512 85.333333C276.352 85.333333 85.333333 276.352 85.333333 512s191.018667 426.666667 426.666667 426.666667 426.666667-191.018667 426.666667-426.666667c0-56.746667-11.093333-112-32.384-163.328a21.333333 21.333333 0 0 0-39.402667 16.341333A382.762667 382.762667 0 0 1 896 512c0 212.074667-171.925333 384-384 384S128 724.074667 128 512 299.925333 128 512 128c51.114667 0 100.8 9.984 146.986667 29.12a21.333333 21.333333 0 0 0 16.341333-39.402667z" fill="#333333" p-id="3956"></path></svg>');
        __publicField(this, "refreshSvg", '<svg t="1760926993643" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5942" width="200" height="200"><path d="M511.966722 0a511.966722 511.966722 0 1 0 179.828311 32.445891l-22.46254 59.964102A447.970882 447.970882 0 1 1 511.966722 63.99584a31.99792 31.99792 0 0 0 0-63.99584z" fill="#333333" p-id="5943"></path><path d="M649.2378 9.151405A30.909991 30.909991 0 0 1 671.316364 0h193.267438a31.99792 31.99792 0 0 1 31.357962 31.99792c0 17.662852-13.759106 31.99792-31.357962 31.99792H703.954243v160.629559a31.99792 31.99792 0 0 1-31.99792 31.357962 31.485953 31.485953 0 0 1-31.99792-31.357962V31.357962c0-8.511447 3.647763-16.318939 9.343392-21.950573z" fill="#333333" p-id="5944"></path></svg>');
        __publicField(this, "blacklistSvg", '<svg t="1761386375897" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1936" width="200" height="200"><path d="M513.199827 65.667605c-246.537999 0-446.399933 199.861934-446.399933 446.399933 0 246.553349 199.861934 446.399933 446.399933 446.399933 246.553349 0 446.399933-199.846584 446.399933-446.399933C959.599759 265.529539 759.753175 65.667605 513.199827 65.667605zM513.199827 894.697075c-211.320916 0-382.629537-171.322947-382.629537-382.628514 0-94.183056 34.029024-180.417069 90.461291-247.080352l165.389818 165.389818c4.320399 39.651069 26.816762 73.840752 58.981323 94.068446-72.189136 27.369348-123.517151 97.156784-123.517151 178.936345l337.541643 0 100.846826 100.846826C693.608709 860.664981 607.375719 894.697075 513.199827 894.697075zM805.362956 759.14175 697.264982 651.0448c-16.556071-58.332547-60.10082-105.306394-116.275213-126.601396 35.888372-22.570042 59.752896-62.511729 59.752896-108.032482 0-70.436212-57.108672-127.542838-127.542838-127.542838-48.218188 0-90.184999 26.765597-111.865787 66.245773L266.120498 219.900316c66.663282-56.432267 152.897296-90.461291 247.079328-90.461291 211.304544 0 382.628514 171.308621 382.628514 382.629537C895.82834 606.244454 861.796246 692.476421 805.362956 759.14175z" fill="#272636" p-id="1937"></path></svg>');
        __publicField(this, "removeSvg", '<svg t="1761958343616" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1939" width="200" height="200"><path d="M405.312 736a32 32 0 0 1-32-32V448a32 32 0 0 1 64 0v256a32 32 0 0 1-32 32zM650.688 448a32 32 0 0 0-64 0v256a32 32 0 1 0 64 0V448z" fill="#333333" p-id="1940"></path><path d="M514.816 53.312h-2.752c-21.504 0-39.808 0-55.04 1.408a116.672 116.672 0 0 0-45.568 12.352c-5.76 3.008-11.2 6.528-16.32 10.496a116.608 116.608 0 0 0-30.144 36.352c-7.552 13.248-15.168 29.888-24.128 49.536l-17.856 39.232H128a32 32 0 0 0 0 64h32V832A160 160 0 0 0 320 992h384a160 160 0 0 0 160-160V266.688h32a32 32 0 0 0 0-64h-190.912l-20.992-43.264c-9.152-18.944-16.896-35.008-24.576-47.744a116.608 116.608 0 0 0-30.208-35.072 117.376 117.376 0 0 0-16.064-10.112 116.608 116.608 0 0 0-44.736-11.84c-14.784-1.28-32.64-1.28-53.696-1.28zM800 266.688V832a96 96 0 0 1-96 96H320A96 96 0 0 1 224 832V266.688h576z m-166.016-64h-240.64l5.184-11.456c9.664-21.184 16.064-35.2 22.016-45.568a54.144 54.144 0 0 1 13.568-17.28 53.312 53.312 0 0 1 7.424-4.8 54.144 54.144 0 0 1 21.312-5.12c11.968-1.088 27.328-1.152 50.624-1.152 22.72 0 37.76 0 49.344 1.088 11.072 0.96 16.704 2.752 20.928 4.928 2.56 1.28 4.992 2.88 7.36 4.608 3.776 2.816 7.808 7.168 13.504 16.64 6.016 10.048 12.608 23.488 22.528 43.968l6.848 14.08z" fill="#333333" p-id="1941"></path></svg>');
        __publicField(this, "copySvg", '<svg t="1749017229420" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="9184" width="200" height="200"><path d="M512 74.666667C270.933333 74.666667 74.666667 270.933333 74.666667 512S270.933333 949.333333 512 949.333333 949.333333 753.066667 949.333333 512 753.066667 74.666667 512 74.666667z m0 810.666666c-204.8 0-373.333333-168.533333-373.333333-373.333333S307.2 138.666667 512 138.666667 885.333333 307.2 885.333333 512 716.8 885.333333 512 885.333333z" fill="#666666" p-id="9185"></path><path d="M512 512m-42.666667 0a42.666667 42.666667 0 1 0 85.333334 0 42.666667 42.666667 0 1 0-85.333334 0Z" fill="#666666" p-id="9186"></path><path d="M341.333333 512m-42.666666 0a42.666667 42.666667 0 1 0 85.333333 0 42.666667 42.666667 0 1 0-85.333333 0Z" fill="#666666" p-id="9187"></path><path d="M682.666667 512m-42.666667 0a42.666667 42.666667 0 1 0 85.333333 0 42.666667 42.666667 0 1 0-85.333333 0Z" fill="#666666" p-id="9188"></path></svg>');
        __publicField(this, "titleSvg", '<svg t="1747553289744" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7507" width="200" height="200"><path d="M959.8 150.8c0-2.3-1.9-4.2-4.2-4.2H253.3c-2.3 0-4.2 1.9-4.2 4.2v115.9c0 2.3 1.9 4.2 4.2 4.2h702.3c2.3 0 4.2-1.9 4.2-4.2V150.8z" fill="" p-id="7508"></path><path d="M126.4 208.8m-62.2 0a62.2 62.2 0 1 0 124.4 0 62.2 62.2 0 1 0-124.4 0Z" fill="" p-id="7509"></path><path d="M851.5 453.7c0-2.1-1.8-3.9-3.9-3.9H252.9c-2.1 0-3.9 1.7-3.9 3.9v116.6c0 2.1 1.7 3.9 3.9 3.9h594.7c2.1 0 3.9-1.7 3.9-3.9V453.7z" fill="" p-id="7510"></path><path d="M126.4 512m-62.2 0a62.2 62.2 0 1 0 124.4 0 62.2 62.2 0 1 0-124.4 0Z" fill="" p-id="7511"></path><path d="M851.5 756.9c0-2.1-1.8-3.9-3.9-3.9H252.9c-2.1 0-3.9 1.8-3.9 3.9v116.6c0 2.1 1.7 3.9 3.9 3.9h594.7c2.1 0 3.9-1.7 3.9-3.9V756.9z" fill="" p-id="7512"></path><path d="M126.4 815.2m-62.2 0a62.2 62.2 0 1 0 124.4 0 62.2 62.2 0 1 0-124.4 0Z" fill="" p-id="7513"></path></svg>');
        __publicField(this, "carNumSvg", '<svg t="1747552574854" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3539" width="200" height="200"><path d="M920.337035 447.804932c-6.067182-6.067182-10.918677-11.643178-16.985859-17.71036l48.536436-30.334889-42.469254-109.207238-121.340579 12.134365c-6.067182-6.067182-6.067182-12.134365-12.134365-18.201547-12.134365-12.134365-18.201547-24.267706-24.267706-30.334889-24.26873-36.402071-30.334889-42.469254-54.603619-42.469254H339.116511c-18.201547 0-24.267706 6.067182-54.603619 42.469254-6.067182 6.067182-12.134365 18.201547-24.267706 30.334889 0 0-6.067182 6.067182-12.134365 18.201547l-115.27442-12.134365-48.536436 109.207238 51.090608 24.378223c-6.067182 6.067182-30.334889 34.660404-30.334889 34.660405l-15.542998 22.280446-12.282744 17.018605c-6.067182 12.134365-5.064342 10.868535-5.064342 29.070082v224.480635c0 36.402071 18.201547 60.670801 54.603618 60.670801h115.273397c36.402071 0 54.603619-24.267706 54.603619-54.603619v-18.201547h424.693562v18.201547c0 30.334889 18.201547 54.603619 54.603618 54.603619h115.273397c36.402071 0 60.670801-24.267706 60.670801-60.670801V539.300786c0-42.469254 0.685615-46.662763-11.44875-64.863287-4.731768-6.744611-11.94403-16.196891-20.101827-26.632567z m-35.186383-78.381161l-30.334889 18.201547-12.134365-12.134365c-6.067182-8.899694-12.134365-12.134365-12.134365-18.201547l42.469254-6.067183 12.134365 18.201548z m-533.899776-97.072873h339.755054l78.871325 103.140055H272.378527l78.872349-103.140055zM175.305655 357.290429h36.402071c-6.067182 6.067182-6.067182 12.134365-12.134365 18.201547l-18.201547 6.067183-18.201547-12.134365 12.135388-12.134365z m667.375743 394.35765h-54.603619V678.843936H242.043638v72.804143H132.837424V527.167444c0-12.134365-0.041956-20.662599 1.216711-23.556508 1.258667-2.89391 9.955746-16.924461 21.193695-29.173437l35.722596-38.276768h639.576607l21.917172 20.938891c6.067182 6.067182 21.847587 21.366633 25.712615 28.732392 7.621585 9.996678 6.973832 10.999518 13.041014 23.133883v242.682182h-48.536436zM242.043638 533.234627h133.474944v60.670801H242.043638v-60.670801z m412.559197 0h133.474944v60.670801H654.602835v-60.670801z" p-id="3540"></path></svg>');
        __publicField(this, "downSvg", '<svg t="1747552626242" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4551" width="200" height="200"><path d="M641.6 660l-8.64-64 32-4.32a211.2 211.2 0 0 0-26.72-420.32 215.36 215.36 0 0 0-213.12 192 94.56 94.56 0 0 0 0 11.52v41.28h-64V384v-7.04a153.12 153.12 0 0 1 0-19.52A279.84 279.84 0 0 1 636.16 108H640A275.2 275.2 0 0 1 673.28 656z" fill="#333333" p-id="4552"></path><path d="M490.4 446.24l-7.52-39.84a182.4 182.4 0 0 1 107.52-162.88l29.12-13.28L646.08 288l-29.12 13.28a117.92 117.92 0 0 0-70.08 101.28l6.24 30.4zM392.96 652.32h-78.72A202.24 202.24 0 0 1 256 256l30.72-9.12 18.24 61.28-30.72 9.12a138.24 138.24 0 0 0 39.68 270.72h78.72zM479.2 512h64v320h-64z" fill="#333333" p-id="4553"></path><path d="M510.4 908l-156.32-147.68 43.84-46.4 112.48 106.08 112.8-106.08 43.84 46.56-156.64 147.52z" fill="#333333" p-id="4554"></path></svg>');
        __publicField(this, "handleSvg", '<svg t="1749106236917" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2628" width="200" height="200"><path d="M838 989.48a32 32 0 0 1-22.5-9.22L519.3 687.6 207.48 980.8a32 32 0 0 1-54-23.32V136.52A98.54 98.54 0 0 1 252 38.1h519.6A98.52 98.52 0 0 1 870 136.52v820.96a32 32 0 0 1-32 32zM252 102.1a34.46 34.46 0 0 0-34.42 34.42v746.96L498 619.84a32 32 0 0 1 44.42 0.56L806 880.88V136.52a34.46 34.46 0 0 0-34.4-34.42z" p-id="2629"></path><path d="M648 604.92a28 28 0 0 1-16.46-5.34l-112.84-82-112.84 82a28 28 0 0 1-43.08-31.32l43.1-132.64-112.84-82a28 28 0 0 1 16.46-50.66h139.48L492 170.34a28 28 0 0 1 53.26 0l43.1 132.64h139.48a28 28 0 0 1 16.46 50.66l-112.84 82 43.1 132.64A28 28 0 0 1 648 604.92z m-129.3-150a27.86 27.86 0 0 1 16.46 5.36l59.58 43.28-22.76-70a28 28 0 0 1 10.02-31.28l59.58-43.3H568a28 28 0 0 1-26.64-19.34l-22.76-70-22.76 70a28 28 0 0 1-26.62 19.34h-73.64l59.58 43.3a28 28 0 0 1 10.16 31.3l-22.76 70 59.58-43.28a28 28 0 0 1 16.46-5.32z" p-id="2630"></path></svg>');
        __publicField(this, "siteSvg", '<svg t="1749107903569" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12439" width="200" height="200"><path d="M882.758621 133.674884C882.758621 59.84828 822.91034 0 749.083736 0 675.25715 0 615.40887 59.84828 615.40887 133.674884 615.40887 163.358402 625.152318 191.656395 642.813352 214.773283L670.872117 193.336726 648.314739 166.170836 253.911693 493.666092 276.469054 520.831982 302.371681 496.834595C277.256669 469.725608 241.995388 453.990153 204.295574 453.990153 130.46897 453.990153 70.62069 513.838433 70.62069 587.66502 70.62069 661.491624 130.46897 721.339904 204.295574 721.339904 255.555319 721.339904 301.619094 692.208675 324.036714 647.136344L276.646223 663.002394 706.082022 877.440106 721.856794 845.849335 690.37312 829.861888C680.932829 848.452414 675.940882 869.068818 675.940882 890.325116 675.940882 964.15172 735.789162 1024 809.615766 1024 883.442353 1024 943.290633 964.15172 943.290633 890.325116 943.290633 874.050807 940.36533 858.125365 934.723584 843.16446L868.645076 868.0826C871.294817 875.109252 872.669943 882.595452 872.669943 890.325116 872.669943 925.14899 844.439623 953.37931 809.615766 953.37931 774.791892 953.37931 746.561571 925.14899 746.561571 890.325116 746.561571 880.245089 748.902894 870.575616 753.340487 861.836782L769.436089 830.140063 737.631567 814.258564 308.195769 599.820853 276.554929 584.02108 260.805279 615.686903C250.212352 636.984797 228.494795 650.719214 204.295574 650.719214 169.4717 650.719214 141.241379 622.488894 141.241379 587.66502 141.241379 552.841163 169.4717 524.610842 204.295574 524.610842 222.12269 524.610842 238.680594 531.99985 250.566444 544.829369L273.29589 569.363385 299.026432 547.997855 693.429478 220.502616 719.514606 198.84265 698.930882 171.900169C690.596687 160.991373 686.029559 147.727007 686.029559 133.674884 686.029559 98.85101 714.25988 70.62069 749.083736 70.62069 783.90761 70.62069 812.137931 98.85101 812.137931 133.674884 812.137931 148.208022 807.249885 161.899255 798.379608 172.996785L853.543883 217.089695C872.331935 193.584128 882.758621 164.379366 882.758621 133.674884ZM749.083736 196.729062C729.149334 196.729062 710.818745 187.460449 698.930882 171.900169L642.813352 214.773283C667.922573 247.639305 706.904064 267.349751 749.083736 267.349751 790.225902 267.349751 828.357809 248.599782 853.543883 217.089695L798.379608 172.996785C786.455411 187.915034 768.530291 196.729062 749.083736 196.729062ZM337.970441 587.66502C337.970441 553.551854 325.093782 521.360666 302.371681 496.834595L250.566444 544.829369C261.309069 556.424898 267.349751 571.526356 267.349751 587.66502 267.349751 597.565263 265.091478 607.069184 260.805279 615.686903L324.036714 647.136344C333.156105 628.801148 337.970441 608.540036 337.970441 587.66502ZM809.615766 756.650249C758.753986 756.650249 712.986006 785.330865 690.37312 829.861888L753.340487 861.836782C764.027215 840.791658 785.603302 827.270938 809.615766 827.270938 836.08553 827.270938 859.461862 843.730308 868.645076 868.0826L934.723584 843.16446C915.252259 791.529949 865.714547 756.650249 809.615766 756.650249Z" fill="#389BFF" p-id="12440"></path></svg>');
        __publicField(this, "videoSvg", '<svg t="1749003664455" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1952" width="200" height="200"><path d="M825.6 153.6H198.4C124.5 153.6 64 214.1 64 288v448c0 73.9 60.5 134.4 134.4 134.4h627.2c73.9 0 134.4-60.5 134.4-134.4V288c0-73.9-60.5-134.4-134.4-134.4z m-138.2 44.8l112 112H706l-112-112h93.4z m-156.8 0l112 112H526.7l-112-112h115.9z m-179.2 0l112 112H347.5l-112-112h115.9zM108.8 288c0-41.4 28.4-76.1 66.7-86.3l108.7 108.7H108.8V288z m806.4 448c0 49.4-40.2 89.6-89.6 89.6H198.4c-49.4 0-89.6-40.2-89.6-89.6V355.2h806.4V736z m0-425.6h-52.5l-112-112h74.9c49.4 0 89.6 40.2 89.6 89.6v22.4z" p-id="1953"></path><path d="M454 687.2l149.3-77.6c27.5-13.8 27.5-53 0-66.8L468 472.2c-31.2-15.6-68 7.1-68 42v139.6c0 27.8 29.2 45.8 54 33.4zM444.8 512l134.4 67.2-134.4 67.2V512z" p-id="1954"></path></svg>');
        __publicField(this, "screenSvg", '<svg t="1750691468062" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2693" width="200" height="200"><path d="M288 160a64 64 0 0 0-64 64v576a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64v-576a64 64 0 0 0-64-64h-448m0-64h448a128 128 0 0 1 128 128v576a128 128 0 0 1-128 128h-448a128 128 0 0 1-128-128v-576a128 128 0 0 1 128-128z" fill="#4078FD" p-id="2694"></path><path d="M416 352m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#FE9C23" p-id="2695"></path><path d="M352 732.448a32 32 0 0 1-32-32v-160a32 32 0 0 1 44.224-29.568l130.112 53.632 153.952-169.984a32 32 0 0 1 55.712 21.472v284.448a32 32 0 0 1-32 32z m0-32h320z" fill="#4078FD" opacity=".2" p-id="2696"></path><path d="M672 416l-169.088 186.656-150.912-62.208v160h320V416m0-32a32 32 0 0 1 32 32v284.448a32 32 0 0 1-32 32h-320a32 32 0 0 1-32-32v-160a32 32 0 0 1 44.192-29.6l130.112 53.632 153.984-169.984a32 32 0 0 1 23.712-10.496z" fill="#4078FD" p-id="2697"></path></svg>');
        __publicField(this, "recoveryVideoSvg", '<svg t="1749003779161" class="jhs-icon icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8204" width="200" height="200"><path d="M938.666667 553.92V768c0 64.8-52.533333 117.333333-117.333334 117.333333H202.666667c-64.8 0-117.333333-52.533333-117.333334-117.333333V256c0-64.8 52.533333-117.333333 117.333334-117.333333h618.666666c64.8 0 117.333333 52.533333 117.333334 117.333333v297.92z m-64-74.624V256a53.333333 53.333333 0 0 0-53.333334-53.333333H202.666667a53.333333 53.333333 0 0 0-53.333334 53.333333v344.48A290.090667 290.090667 0 0 1 192 597.333333a286.88 286.88 0 0 1 183.296 65.845334C427.029333 528.384 556.906667 437.333333 704 437.333333c65.706667 0 126.997333 16.778667 170.666667 41.962667z m0 82.24c-5.333333-8.32-21.130667-21.653333-43.648-32.917333C796.768 511.488 753.045333 501.333333 704 501.333333c-121.770667 0-229.130667 76.266667-270.432 188.693334-2.730667 7.445333-7.402667 20.32-13.994667 38.581333-7.68 21.301333-34.453333 28.106667-51.370666 13.056-16.437333-14.634667-28.554667-25.066667-36.138667-31.146667A222.890667 222.890667 0 0 0 192 661.333333c-14.464 0-28.725333 1.365333-42.666667 4.053334V768a53.333333 53.333333 0 0 0 53.333334 53.333333h618.666666a53.333333 53.333333 0 0 0 53.333334-53.333333V561.525333zM320 480a96 96 0 1 1 0-192 96 96 0 0 1 0 192z m0-64a32 32 0 1 0 0-64 32 32 0 0 0 0 64z" fill="#000000" p-id="8205"></path></svg>');
    }
    getName() {
        throw new Error(`${this.constructor.name} 未显示getName()`);
    }
    getBean(name2) {
        return this.pluginManager.getBean(name2);
    }
    async initCss() {
        return "";
    }
    async handle() {}
    getPageInfo() {
        let carNum2, url, actress, actors, publishTime, currentHref2 = window.location.href;
        if (isJavDb) {
            carNum2 = $('a[title="複製番號"], a[title="复制番号"]').attr("data-clipboard-text");
            url = currentHref2.split("?")[0].split("#")[0];
            actress = $(".actor-female").map(((i, el) => $(el).text())).get().join(" ");
            actors = $(".value a:not(.actor-female)").map(((i, el) => $(el).text())).get().join(" ");
            publishTime = $('strong:contains("日期:")').parent(".panel-block").find(".value").text().trim();
        }
        if (isJavBus) {
            url = currentHref2.split("?")[0];
            carNum2 = url.split("/").filter(Boolean).pop().replace(/_\d{4}-\d{2}-\d{2}$/, "");
            actress = $('span[onmouseover*="star_"] a').map(((i, el) => $(el).text())).get().join(" ");
            actors = "";
            publishTime = $('span.header:contains("發行日期:")').parent("p").text().trim().replace("發行日期:", "").trim();
        }
        return {
            carNum: carNum2,
            url: url,
            actress: actress,
            actors: actors,
            publishTime: publishTime
        };
    }
    getActressId() {
        const match = currentHref.match(/\/actors\/([^/?]+)/);
        return match && match.length > 1 ? match[1] : null;
    }
    getActressPageInfo() {
        let currentHref2 = window.location.href;
        if (!currentHref2.includes("/actors/") && !currentHref2.includes("/star/")) throw new Error("接口调用错误, 非演员详情页");
        let nameList = [], $actor = isJavDb ? $(".actor-section-name") : $(".avatar-box .photo-info .pb10");
        $actor.length && $actor.text().trim().split(",").forEach((name2 => {
            nameList.push(name2.trim());
        }));
        let $sectionMeta = $(".section-meta:not(:contains('影片'))");
        $sectionMeta.length && $sectionMeta.text().trim().split(",").forEach((name2 => {
            nameList.push(name2.trim());
        }));
        let role = $(".section-meta:contains('男優')").length > 0 ? "actor" : "actress", movieType = "censored";
        nameList.some((n => n.includes("無碼"))) && (movieType = "uncensored");
        currentHref2.includes("uncensored") && (movieType = "uncensored");
        let blacklistUrl = null, starId = null;
        const urlObj = new URL(currentHref2);
        if (isJavDb) {
            starId = urlObj.pathname.split("/").filter((segment => "" !== segment.trim())).pop();
            const params = urlObj.searchParams;
            params.delete("sort_type");
            params.delete("page");
            blacklistUrl = urlObj.toString();
        } else if (isJavBus) {
            const splitStr = "/star/", parts = currentHref2.split(splitStr);
            if (parts.length < 2) throw new Error("提取演员url失败");
            const host = parts[0];
            starId = parts[1].split("/")[0];
            blacklistUrl = host + splitStr + starId;
        }
        return {
            starId: starId,
            name: nameList[0],
            allName: nameList,
            role: role,
            movieType: movieType,
            blacklistUrl: blacklistUrl
        };
    }
    getSelector(type) {
        const key = type || (isJavDb ? "javdb" : isJavBus ? "javbus" : null), selectors = {
            javdb: {
                boxSelector: ".movie-list",
                itemSelector: ".movie-list .item",
                coverImgSelector: ".cover img",
                requestDomItemSelector: ".movie-list .item",
                nextPageSelector: ".pagination-next"
            },
            javbus: {
                boxSelector: ".masonry",
                itemSelector: ".masonry .item:not(:has(.avatar-box))",
                coverImgSelector: ".masonry .movie-box .photo-frame img",
                requestDomItemSelector: "#waterfall .item",
                nextPageSelector: "#next"
            }
        };
        if (!key || !selectors[key]) throw new Error("类型错误: 无法确定选择器类型 (JavDb 或 JavBus)");
        return selectors[key];
    }
    parseMovieId(href) {
        return href.split("/").pop().split(/[?#]/)[0];
    }
    getBoxCarInfo($box2) {
        var _a2, _b, _c;
        const $aLink = $box2.find("a");
        let carNum2, title, publishTime, url = $aLink.attr("href");
        url && !url.includes("http") && (url = window.location.origin + url);
        if ($box2.find(".score").length > 0) {
            const $videoTitle = $box2.find(".video-title");
            carNum2 = $videoTitle.find("strong").text().trim();
            publishTime = $box2.find(".meta").text().trim();
            title = (null == (_a2 = $aLink.attr("title")) ? void 0 : _a2.trim()) || $videoTitle.text().replace(carNum2 || "", "").trim();
            carNum2 = this._formatWesternCar(carNum2, publishTime);
        } else {
            const $imgEle = $box2.find("img");
            title = (null == (_b = $imgEle.attr("title")) ? void 0 : _b.trim()) || (null == (_c = $imgEle.attr("data-title")) ? void 0 : _c.trim()) || $box2.find("a.movie-box").attr("title");
            const dateElements = $box2.find("date").map(((i, el) => $(el).text().trim())).get(), isDate = s => /^\d{4}-\d{1,2}-\d{1,2}$/.test(s);
            publishTime = dateElements.find(isDate) || "";
            carNum2 = dateElements.find((i => !isDate(i))) || "";
        }
        if (!carNum2) {
            throw new JhsError("提取番号信息失败: carNum 为空", $box2.get(0));
        }
        return {
            movieId: url.split("/").pop().split(/[?#]/)[0],
            carNum: carNum2,
            url: url,
            aHref: url,
            title: title ?? "",
            publishTime: publishTime
        };
    }
    _formatWesternCar(carNum2, rawDate) {
        if (!carNum2 || !rawDate) return carNum2;
        if (!/^[a-zA-Z\s]+$/.test(carNum2)) return carNum2;
        const dateMatch = rawDate.match(/\d{2}(\d{2})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            return `${carNum2.replace(/\s+/g, "")}.${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
        }
        return carNum2;
    }
    getBoxCarInfoList($boxList = null) {
        $boxList || ($boxList = $(this.getSelector().itemSelector));
        if (0 === $boxList.length) {
            clog.error("获取当前列表页所有item的番号信息失败!");
            return [];
        }
        const results = [];
        $boxList.each(((index, element) => {
            const $box2 = $(element);
            try {
                const carInfo = this.getBoxCarInfo($box2);
                results.push(carInfo);
            } catch (error) {
                clog.error("[getBoxCarInfoList] 提取单个 boxCar 信息失败:", error.message, "元素索引:", index);
            }
        }));
        return results;
    }
    checkDuplicateCarNumbers(currentList, newList) {
        if (!isJavDb) return !1;
        if (!currentList || 0 === currentList.length || !newList || 0 === newList.length) return !1;
        const currentCarNums = new Set(currentList.map((item => item.carNum)).filter((n => n)));
        if (0 === currentCarNums.size) return !1;
        let consecutiveDuplicates = 0;
        for (let i = 0; i < newList.length; i++) {
            const newCarNum = newList[i] ? newList[i].carNum : null;
            if (newCarNum && currentCarNums.has(newCarNum)) {
                consecutiveDuplicates++;
                if (consecutiveDuplicates >= 2) {
                    clog.warn("警告: 检测到连续番号信息重复, 该类别可能已被限制页码。");
                    return !0;
                }
            } else consecutiveDuplicates = 0;
        }
        return !1;
    }
}

class DetailPagePlugin extends BasePlugin {
    getName() {
        return "DetailPagePlugin";
    }
    constructor() {
        super();
    }
    handle() {
        if (window.isDetailPage) {
            $(".video-meta-panel a").each((function() {
                const href = $(this).attr("href");
                href && (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/")) && $(this).attr("target", "_blank");
            }));
            this.handleFancyBox();
        }
    }
    handleFancyBox() {
        document.addEventListener("click", (function(e) {
            if (e.target.closest(".fancybox-button--thumbs")) {
                const isVisible = !$(".fancybox-thumbs").is(":hidden");
                localStorage.setItem("jhs_fancyboxThumbs", isVisible.toString());
                unsafeWindow.$.fancybox.defaults.thumbs.autoStart = isVisible;
            }
        }));
        if (void 0 !== unsafeWindow.$.fancybox) {
            const savedState = localStorage.getItem("jhs_fancyboxThumbs");
            unsafeWindow.$.fancybox.defaults.thumbs.autoStart = "true" === savedState;
        }
    }
}

// ===== [更高画质预览视频] selectDefaultQuality/CACHE_KEY/DmmVideoFetcher/getDmmVideo (源2404-2581行) =====
const selectDefaultQuality = (dmmVideoQualityList, intendedDefault) => {
    if (!dmmVideoQualityList || 0 === dmmVideoQualityList.length) return null;
    const availableSet = new Set(dmmVideoQualityList);
    if (availableSet.has(intendedDefault)) return intendedDefault;
    const priorityOrder = qualityOptions.map((option => option.quality)).reverse();
    for (const quality of priorityOrder) if (availableSet.has(quality)) return quality;
    return dmmVideoQualityList[0];
}, CACHE_KEY = "jhs_dmm_video";

class DmmVideoFetcher {
    constructor(carNum2, showErrorMessages = !0) {
        this.carNum = carNum2;
        this.showErrorMessages = showErrorMessages;
    }
    _checkCache() {
        const cachedData = localStorage.getItem(CACHE_KEY) ? JSON.parse(localStorage.getItem(CACHE_KEY)) : {};
        if (cachedData[this.carNum]) {
            clog.debug("缓存中存在预览视频信息", cachedData[this.carNum]);
            return cachedData[this.carNum];
        }
        return null;
    }
    _updateCache(videoMap) {
        const cachedData = localStorage.getItem(CACHE_KEY) ? JSON.parse(localStorage.getItem(CACHE_KEY)) : {};
        cachedData[this.carNum] = videoMap;
        clog.debug("成功解析出预览视频并已缓存:", videoMap);
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    }
    async _searchContentIds() {
        const carNum2 = this.carNum, carNumNoHyphen = carNum2.replace(/-/g, ""), keywordAttempts = [ {
            keyword: carNum2.replace("-", "00"),
            name: "00-替换关键词"
        }, {
            keyword: carNum2,
            name: "原始番号关键词"
        }, {
            keyword: carNumNoHyphen,
            name: "无连字符关键词"
        } ], carNumLower = carNum2.toLowerCase();
        for (const attempt of keywordAttempts) {
            const {keyword: keyword, name: name2} = attempt, currentTempCarNumLower = keyword.toLowerCase(), apiUrl2 = `https://api.dmm.com/affiliate/v3/ItemList?${new URLSearchParams({
                api_id: "UrwskPfkqQ0DuVry2gYL",
                affiliate_id: "10278-996",
                output: "json",
                site: "FANZA",
                sort: "match",
                keyword: keyword
            }).toString()}`;
            let response;
            try {
                response = await gmHttp.get(apiUrl2);
            } catch (e) {
                clog.error(`API 请求失败，跳过 ${name2}:`, e);
                continue;
            }
            if (!response || !response.result || !response.result.result_count) {
                clog.debug(`使用 ${name2} (${keyword}) 进行 API 搜索 返回无结果，尝试下一个关键词。`);
                continue;
            }
            const newItems = [];
            for (const item of response.result.items) {
                if (newItems.length >= 2) break;
                const contentId = item.content_id || "", makerProduct = item.maker_product || "";
                if (contentId.includes(currentTempCarNumLower.replace("-", "")) || carNumLower === makerProduct.toLowerCase() || contentId.includes(carNumNoHyphen.toLowerCase())) {
                    newItems.push({
                        serviceCode: item.service_code,
                        floorCode: item.floor_code,
                        contentId: contentId,
                        pageUrl: item.URL
                    });
                    clog.debug(`[${name2}] cid|makerProduct 匹配成功:`, contentId, makerProduct);
                }
            }
            if (newItems.length > 0) {
                clog.debug(`--- 成功通过 ${name2} 找到 Content IDs ---`);
                const $btn2 = $("#fanzaBtn");
                let url = `https://www.dmm.co.jp/search/=/searchstr=${keyword}`, type = "single";
                if (newItems.length > 1) {
                    $btn2.attr("href", url);
                    $btn2.append('<span class="site-tag" style="top:-15px">多结果</span>');
                    $btn2.css("backgroundColor", "#7bc73b");
                    type = "multiple";
                } else {
                    url = newItems[0].pageUrl;
                    $btn2.attr("href", url);
                    $btn2.css("backgroundColor", "#7bc73b");
                }
                const dmmCacheKey = "jhs_other_site_dmm", dmmCacheData = localStorage.getItem(dmmCacheKey) ? JSON.parse(localStorage.getItem(dmmCacheKey)) : {};
                dmmCacheData[this.carNum] = {
                    type: type,
                    url: url
                };
                localStorage.setItem(dmmCacheKey, JSON.stringify(dmmCacheData));
                return newItems;
            }
            clog.debug(`[${name2}] API 返回结果数 ${response.result.result_count}，但无精确匹配的 Content ID。`);
        }
        clog.warn("所有关键词尝试均未找到匹配的Content ID, 解析Dmm视频失败");
        const $btn = $("#fanzaBtn");
        $btn.attr("href", `https://www.dmm.co.jp/search/=/searchstr=${this.carNum}`);
        $btn.attr("title", "未查询到, 点击前往搜索页");
        $btn.css("backgroundColor", "#de3333");
        return null;
    }
    async _extractTrailerLinks({contentId: contentId, serviceCode: serviceCode, floorCode: floorCode}) {
        const trailerPageUrl = `https://www.dmm.co.jp/service/digitalapi/-/html5_player/=/cid=${contentId}/mtype=AhRVShI_/service=${serviceCode}/floor=${floorCode}/mode=/`, htmlContent = await gmHttp.get(trailerPageUrl, null, {
            "accept-language": "ja-JP,ja;q=0.9",
            Cookie: "age_check_done=1"
        });
        if ("string" != typeof htmlContent) {
            clog.error(htmlContent);
            throw new Error("解析播放页内容失败, 非文本内容");
        }
        if (htmlContent.includes("このサービスはお住まいの地域からは")) throw new Error("节点不可用，请将DMM域名分流到日本ip");
        const match = htmlContent.match(/const\s+args\s+=\s+(.*);/);
        if (!match) throw new Error("未在脚本中找到 const args = ... 变量");
        let bitrates;
        try {
            ({bitrates: bitrates} = JSON.parse(match[1]));
        } catch (e) {
            throw new Error(`解析播放器脚本 JSON 失败: ${e.message}`);
        }
        const finalQualityMap = {}, qualityKeys = qualityOptions.map((o => o.quality)).join("|"), qualityNameRegex = new RegExp(`(${qualityKeys})\\.mp4$`);
        if (!Array.isArray(bitrates)) {
            clog.error("解析画质链接失败: bitrates 字段不是一个数组或不存在");
            throw new Error("解析画质链接失败: bitrates 字段不是一个数组或不存在");
        }
        clog.debug("原始数据返回:", bitrates);
        for (const item of bitrates) {
            const url = null == item ? void 0 : item.src;
            if (!url || "string" != typeof url || !url.endsWith(".mp4")) continue;
            const qualityMatch = url.match(qualityNameRegex);
            let qualityKey = "";
            qualityMatch && qualityMatch[1] && (qualityKey = qualityMatch[1]);
            qualityKey && !finalQualityMap[qualityKey] && (finalQualityMap[qualityKey] = url);
        }
        if (0 === Object.keys(finalQualityMap).length) throw new Error("未找到匹配要求的预览画质视频");
        return finalQualityMap;
    }
    async fetchVideo() {
        const cachedResult = this._checkCache();
        if (cachedResult) return cachedResult;
        let contentItems;
        try {
            const testCarNum = this.carNum.toLowerCase();
            if (testCarNum.startsWith("heyzo") || /^(n\d+|\d+(-\d+)*)$/.test(testCarNum) || /^n\d+$/.test(testCarNum)) throw new Error("无码番号类型, 取消dmm解析");
            if (this.carNum.includes("VR-")) throw new Error("VR类型, 取消dmm解析");
            contentItems = await this._searchContentIds();
        } catch (e) {
            clog.error("DMM API 搜索失败:", e);
            const $btn = $("#fanzaBtn");
            $btn.attr("href", `https://www.dmm.co.jp/search/=/searchstr=${this.carNum}`);
            $btn.attr("title", "未查询到, 点击前往搜索页");
            $btn.css("backgroundColor", "#de3333");
            return null;
        }
        if (!contentItems || 0 === contentItems.length) return null;
        try {
            const finalVideoMap = await Promise.any(contentItems.map((item => this._extractTrailerLinks(item))));
            this._updateCache(finalVideoMap);
            return finalVideoMap;
        } catch (error) {
            const errors = error.errors || [ error ];
            if (errors.some((err => err.message.includes("节点不可用")))) this.showErrorMessages && show.error("节点不可用，请将DMM域名分流到日本ip"); else {
                const displayError = errors[0].message || errors[0];
                clog.error(`解析失败: ${displayError}`, errors);
                this.showErrorMessages && show.error(`解析失败: ${displayError}`);
            }
            const $btn = $("#fanzaBtn");
            $btn.attr("href", `https://www.dmm.co.jp/search/=/searchstr=${this.carNum}`);
            $btn.attr("title", "未查询到, 点击前往搜索页");
            $btn.css("backgroundColor", "#de3333");
            return null;
        }
    }
}

const getDmmVideo = async (carNum2, showErrorMessages = !0) => new DmmVideoFetcher(carNum2, showErrorMessages).fetchVideo();

// ===== [更高画质预览视频] PreviewVideoPlugin(JavDB详情页,含enableLoadPreviewVideo开关判断) (源2583-2736行) =====
class PreviewVideoPlugin extends BasePlugin {
    getName() {
        return "PreviewVideoPlugin";
    }
    async initCss() {
        return "\n            .video-control-btn {\n                min-width:120px;\n                padding: 7px 12px;\n                font-size: 12px;\n                background: rgba(0,0,0,0.7);\n                color: white;\n                border: none;\n                border-radius: 4px;\n                cursor: pointer;\n            }\n            .video-control-btn.active {\n                background-color: #1890ff;\n                color: white;\n                font-weight: bold;\n                border: 2px solid #096dd9;\n            }\n        ";
    }
    async handle() {
        if (!isDetailPage) return;
        let settingObj = await storageManager.getSetting();
        this.filterHotKey = settingObj.filterHotKey;
        this.favoriteHotKey = settingObj.favoriteHotKey;
        this.speedVideoHotKey = settingObj.speedVideoHotKey;
        $("#preview-video").removeAttr("width height").css({
            width: "",
            height: ""
        });
        let $preview = $(".preview-video-container");
        $preview.on("click", (event => {
            utils.loopDetector((() => $(".fancybox-content #preview-video").length > 0), (() => {
                this.handleVideo().then();
            }));
        }));
        await storageManager.getSetting("enableLoadPreviewVideo", YES) !== YES || currentHref.includes("autoPlay=1") || this.initDmm().then();
        let href = window.location.href;
        (href.includes("gallery-1") || href.includes("gallery-2")) && utils.loopDetector((() => $(".fancybox-content #preview-video").length > 0), (() => {
            $(".fancybox-content #preview-video").length > 0 && this.handleVideo().then();
        }));
        href.includes("autoPlay=1") && $preview.length > 0 && $preview[0].click();
    }
    async initDmm() {
        try {
            const dmmVideoMap = await getDmmVideo(this.getPageInfo().carNum, !1);
            if (!dmmVideoMap) return;
            let settingDefaultVideoQuality = await storageManager.getSetting("videoQuality");
            clog.debug("解析其它画质预览视频", "设置-期望画质", settingDefaultVideoQuality);
            const defaultVideoUrl = dmmVideoMap[selectDefaultQuality(Object.keys(dmmVideoMap), settingDefaultVideoQuality)];
            clog.log("切换其它画质预览视频: ", defaultVideoUrl);
            const $previewVideoEL = $("#preview-video"), videoEl = $previewVideoEL.length ? $previewVideoEL[0] : null, isVideoElementHidden = !videoEl || utils.isHidden($previewVideoEL);
            if ($previewVideoEL.length) {
                if (videoEl) {
                    const currentTime = videoEl.currentTime;
                    $previewVideoEL.attr("src", defaultVideoUrl);
                    if (!isVideoElementHidden) {
                        clog.debug("播放器已手动打开, 变更进度条");
                        videoEl.currentTime = currentTime;
                        videoEl.play();
                    }
                }
            } else {
                clog.debug("JavDB没有视频播放元素, 开始创建...");
                const videoCoverSrc = $(".column-video-cover img").attr("src");
                $(".preview-images").prepend(`\n                    <a class="preview-video-container" data-fancybox="gallery" href="#preview-video">\n                        <span>預告片</span>\n                        <img src="${videoCoverSrc}" class="video-cover" style="width: 150px; height: auto;" alt="">\n                    </a>\n                `);
                $("#preview-video").length || $(".preview-video-container").after('\n                        <video id="preview-video" playsinline controls muted preload="auto" loop style="display:none"> </video>\n                    ');
                $(".preview-video-container").on("click", (event => {
                    utils.loopDetector((() => $(".fancybox-content #preview-video").length > 0), (async () => {
                        await this.handleVideo();
                    }));
                }));
            }
        } catch (error) {
            clog.error("预加载dmm失败:", error);
        }
    }
    async handleVideo() {
        if (await storageManager.getSetting("enableLoadPreviewVideo", YES) === NO) return;
        const $videoEl = $("#preview-video");
        if (!$videoEl.length) return;
        const $videoContainer = $videoEl.parent();
        $videoContainer.css("position", "relative");
        const videoEl = $videoEl[0], jhs_videoMuted = localStorage.getItem("jhs_videoMuted");
        jhs_videoMuted && (videoEl.muted = "yes" === jhs_videoMuted);
        videoEl.addEventListener("volumechange", (function() {
            localStorage.setItem("jhs_videoMuted", videoEl.muted ? "yes" : "no");
        }));
        videoEl.play();
        let carNum2 = this.getPageInfo().carNum;
        const dmmVideoMap = await getDmmVideo(carNum2);
        let $bottomToolbar = $("<div></div>").attr("id", "video-bottom-toolbar").css({
            display: "flex",
            gap: "5px",
            "align-items": "center",
            "flex-wrap": "wrap"
        }), $qualityButtonGroup = $("<div></div>").css({
            display: "flex",
            gap: "5px",
            "align-items": "center"
        }), defaultVideoQuality = null;
        if (dmmVideoMap) {
            let storedQuality = await storageManager.getSetting("videoQuality");
            defaultVideoQuality = selectDefaultQuality(Object.keys(dmmVideoMap), storedQuality);
            let defaultVideoUrl = dmmVideoMap[defaultVideoQuality];
            if ($videoEl.attr("src") !== defaultVideoUrl) {
                $videoEl.attr("src", defaultVideoUrl);
                videoEl.load();
                videoEl.play();
            }
            qualityOptions.forEach((option => {
                let dmmVideoUrl = dmmVideoMap[option.quality];
                if (dmmVideoUrl) {
                    const isActive = defaultVideoQuality === option.quality;
                    let qualityButton = $(`\n                    <button class="video-control-btn${isActive ? " active" : ""}" \n                            id="${option.id}" \n                            data-quality="${option.quality}"\n                            data-video-src="${dmmVideoUrl}"\n                            style="min-width: 40px; border: 1px solid #ccc; background-color: ${isActive ? "#007bff" : "#fff"}; color: ${isActive ? "white" : "black"};">\n                        ${option.text}\n                    </button>\n                `);
                    $qualityButtonGroup.append(qualityButton);
                }
            }));
        }
        $bottomToolbar.append($qualityButtonGroup);
        let $functionButtonGroup = $("<div></div>").css({
            display: "flex",
            gap: "5px",
            "align-items": "center",
            "margin-left": "auto"
        }), filterButton = $(`<button class="menu-btn" id="video-filterBtn" style="min-width: 120px; background-color:#de3333;">屏蔽 ${this.filterHotKey ? "(" + this.filterHotKey + ")" : ""}</button>`);
        $functionButtonGroup.append(filterButton);
        let favoriteButton = $(`<button class="menu-btn" id="video-favoriteBtn" style="min-width: 120px; background-color:#25b1dc;">收藏 ${this.favoriteHotKey ? "(" + this.favoriteHotKey + ")" : ""}</button>`);
        $functionButtonGroup.append(favoriteButton);
        let speedButton = $(`<button class="menu-btn" id="speed-btn" style="min-width: 120px; background-color:#76b45d;">快进 ${this.speedVideoHotKey ? "(" + this.speedVideoHotKey + ")" : ""}</button>`);
        $functionButtonGroup.append(speedButton);
        $bottomToolbar.append($functionButtonGroup);
        $videoContainer.append($bottomToolbar);
        $bottomToolbar.on("click", ".video-control-btn", (async e => {
            const $button = $(e.currentTarget), videoSrc = $button.data("video-src");
            if (!$button.hasClass("active")) try {
                const currentTime = videoEl.currentTime;
                $videoEl.attr("src", videoSrc);
                videoEl.load();
                videoEl.currentTime = currentTime;
                await videoEl.play();
                $bottomToolbar.find(".video-control-btn").removeClass("active").css({
                    "background-color": "#fff",
                    color: "black"
                });
                $button.addClass("active").css({
                    "background-color": "#007bff",
                    color: "white"
                });
            } catch (error) {
                console.error("切换画质失败:", error);
            }
        }));
        $("#speed-btn").on("click", (() => {
            this.getBean("DetailPageButtonPlugin").speedVideo();
        }));
        utils.rightClick(document.body, "#speed-btn", (event => {
            this.getBean("DetailPageButtonPlugin").filterOne(event);
        }));
        $("#video-filterBtn").on("click", (event => {
            this.getBean("DetailPageButtonPlugin").filterOne(event);
        }));
        $("#video-favoriteBtn").on("click", (event => {
            this.getBean("DetailPageButtonPlugin").favoriteOne(event);
        }));
    }
}

// ===== [加载女优信息] ActressInfoPlugin(含enableLoadActressInfo开关判断) (源3205-3294行) =====
class ActressInfoPlugin extends BasePlugin {
    constructor() {
        super(...arguments);
        __publicField(this, "apiUrl", "https://ja.wikipedia.org/wiki/");
    }
    getName() {
        return "ActressInfoPlugin";
    }
    async handle() {
        "yes" === await storageManager.getSetting("enableLoadActressInfo", "yes") && this.loadActressInfo();
    }
    loadActressInfo() {
        this.handleDetailPage().then();
        this.handleStarPage().then();
    }
    async initCss() {
        return "\n            <style>\n                .info-tag {\n                    background-color: #ecf5ff;\n                    display: inline-block;\n                    height: 32px;\n                    padding: 0 10px;\n                    line-height: 30px;\n                    font-size: 12px;\n                    color: #409eff;\n                    border: 1px solid #d9ecff;\n                    border-radius: 4px;\n                    box-sizing: border-box;\n                    white-space: nowrap;\n                }\n            </style>\n        ";
    }
    async handleDetailPage() {
        if ($(".actress-info").length > 0) return;
        let nameList = $(".actor-female").map(((i, el) => $(el).text().trim())).get();
        nameList.length || (nameList = $('span[onmouseover*="star_"] a').map(((i, el) => $(el).text().trim())).get());
        if (!nameList.length) return;
        const cacheKey = "jhs_actress_info", cacheData = localStorage.getItem(cacheKey) ? JSON.parse(localStorage.getItem(cacheKey)) : {};
        let result = null, infoHtml = "";
        for (let i = 0; i < nameList.length; i++) {
            let name2 = nameList[i];
            result = cacheData[name2];
            if (!result) try {
                result = await this.searchInfo(name2);
                result && (cacheData[name2] = result);
            } catch (e) {
                console.error("该名称查询失败,尝试其它名称");
            }
            let contentHtml = "";
            contentHtml = result ? `\n                    <div class="panel-block actress-info">\n                        <strong style="margin-right: 5px;"><span style="user-select: all">${name2}</span>: </strong>\n                        <a href="${result.url}" style="margin-left: 5px" target="_blank">\n                            <span class="info-tag">${result.birthday} ${result.age}</span>\n                            <span class="info-tag">${result.height} ${result.weight}</span>\n                            <span class="info-tag">${result.threeSizeText} ${result.braSize}</span>\n                        </a>\n                    </div>\n                ` : `<div class="panel-block actress-info"><strong style="margin-right: 5px;"><span style="user-select: all">${name2}</span>: </strong><a href="${this.apiUrl + name2}" target="_blank">暂无此演员信息</a></div> `;
            infoHtml += contentHtml;
        }
        isJavDb ? $('strong:contains("演員")').parent().after(infoHtml) : $('span[onmouseover*="star_"]:first').parent().after(infoHtml);
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }
    async handleStarPage() {
        if ($(".actress-info").length > 0) return;
        let nameList = [], $actor = $(".actor-section-name");
        $actor.length && $actor.text().trim().split(",").forEach((name2 => {
            nameList.push(name2.trim());
        }));
        let $sectionMeta = $(".section-meta:not(:contains('影片'))");
        $sectionMeta.length && $sectionMeta.text().trim().split(",").forEach((name2 => {
            nameList.push(name2.trim());
        }));
        if (!nameList.length) return;
        const cacheKey = "jhs_actress_info", cacheData = localStorage.getItem(cacheKey) ? JSON.parse(localStorage.getItem(cacheKey)) : {};
        let result = null;
        for (let i = 0; i < nameList.length; i++) {
            let name2 = nameList[i];
            result = cacheData[name2];
            if (result) break;
            try {
                result = await this.searchInfo(name2);
            } catch (e) {
                console.error("该名称查询失败,尝试其它名称");
            }
            if (result) break;
        }
        result && nameList.forEach((name2 => {
            cacheData[name2] = result;
        }));
        let contentHtml = '<div class="actress-info" style="font-size: 17px; font-weight: normal; margin-top: 5px;">无此相关演员信息</div>';
        result && (contentHtml = `\n                <a class="actress-info" href="${result.url}" target="_blank">\n                    <div style="font-size: 17px; font-weight: normal; margin-top: 5px;">\n                        <div style="display: flex; margin-bottom: 10px;">\n                            <span style="width: 300px;">出生日期: ${result.birthday}</span>\n                            <span style="width: 200px;">年龄: ${result.age}</span>\n                            <span style="width: 200px;">身高: ${result.height}</span>\n                        </div>\n                        <div style="display: flex; margin-bottom: 10px;">\n                            <span style="width: 300px;">体重: ${result.weight}</span>\n                            <span style="width: 200px;">三围: ${result.threeSizeText}</span>\n                            <span style="width: 200px;">罩杯: ${result.braSize}</span>\n                        </div>\n                    </div>\n                </a>\n            `);
        $actor.parent().append(contentHtml);
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }
    async searchInfo(name2) {
        "三上悠亞" === name2 && (name2 = "三上悠亜");
        let url = this.apiUrl + name2;
        const html = await gmHttp.get(url), parser = new DOMParser, $dom = $(parser.parseFromString(html, "text/html"));
        let birthday = $dom.find('a[title="誕生日"]').parent().parent().find("td").text().trim(), age = $dom.find("th:contains('現年齢')").parent().find("td").text().trim() ? parseInt($dom.find("th:contains('現年齢')").parent().find("td").text().trim()) + "岁" : "", height = $dom.find('tr:has(a[title="身長"]) td').text().trim().split(" ")[0] + "cm", weight = $dom.find('tr:has(a[title="体重"]) td').text().trim().split("/")[1].trim();
        "― kg" === weight && (weight = "");
        return {
            birthday: birthday,
            age: age,
            height: height,
            weight: weight,
            threeSizeText: $dom.find('a[title="スリーサイズ"]').closest("tr").find("td").text().replace("cm", "").trim(),
            braSize: $dom.find('th:contains("ブラサイズ")').next("td").contents().first().text().trim(),
            url: url
        };
    }
}

// ===== [弹窗打开页面/悬浮大图] ListPagePlugin 宿主类中与功能相关的两个方法 [节选] =====
// [节选] 原类定义于源6059行, 此处仅保留 bindClick(弹窗方式打开页面)与 replaceHdImg(悬浮大图)两个方法;
// 注意: bindClick/replaceHdImg 依赖的 getBoxCarInfo(源6059类内)与 getSelector(BasePlugin内)未在此重复列出。
class ListPagePlugin extends BasePlugin {
    getName() {
        return "ListPagePlugin";
    }
    async bindClick() {
        let selector = this.getSelector();
        $(selector.boxSelector).on("click", ".item img", (async event => {
            event.preventDefault();
            event.stopPropagation();
            if ($(event.target).closest("div.meta-buttons").length) return;
            const $box2 = $(event.target).closest(".item"), {carNum: carNum2, aHref: aHref} = this.getBoxCarInfo($box2);
            let dialogOpenDetail = await storageManager.getSetting("dialogOpenDetail", YES);
            if (aHref.includes("123av")) this.getBean("Fc2By123AvPlugin").open123AvFc2Dialog(carNum2, aHref); else if (dialogOpenDetail === YES) {
                utils.openPage(aHref, carNum2, !0, event);
                this.$currentImage = null;
            } else window.open(aHref);
        }));
    }

    replaceHdImg(coverImgNodeList) {
        coverImgNodeList && "string" == typeof coverImgNodeList.jquery && (coverImgNodeList = coverImgNodeList.toArray());
        coverImgNodeList || (coverImgNodeList = document.querySelectorAll(this.getSelector().coverImgSelector));
        coverImgNodeList.forEach((img => {
            if (!utils.isHidden(img) && "true" !== img.dataset.hdReplaced) {
                if (isJavDb) {
                    const newSrc = img.src.replace("thumbs", "covers");
                    if (newSrc !== img.src) {
                        img.src = newSrc;
                        img.dataset.hdReplaced = "true";
                    }
                    const itemNode = img.closest(".item");
                    if (itemNode) {
                        const {carNum: carNum2} = this.getBoxCarInfo($(itemNode));
                        if (carNum2) {
                            const newSrc2 = img.src.replace("thumbs", "covers");
                            if (newSrc2 !== img.src) {
                                img.src = newSrc2;
                                img.dataset.hdReplaced = "true";
                            }
                        }
                    }
                }
                if (isJavBus) {
                    const THUMB_PATH_REGEX = /\/(imgs|pics)\/(thumb|thumbs)\//, IMG_EXT_REGEX = /(\.jpg|\.jpeg|\.png)$/i, DMM_THUMB_REGEX = /ps(\.jpg|\.jpeg|\.png)$/i;
                    let newSrc = "";
                    if (THUMB_PATH_REGEX.test(img.src)) {
                        newSrc = img.src.replace(THUMB_PATH_REGEX, "/$1/cover/");
                        img.src.includes("nopic.jpg") || (newSrc = newSrc.replace(IMG_EXT_REGEX, "_b$1"));
                    } else DMM_THUMB_REGEX.test(img.src) && (newSrc = img.src.replace(DMM_THUMB_REGEX, "pl$1"));
                    if (newSrc) {
                        img.dataset.oldSrc = img.src;
                        img.src = newSrc;
                        img.dataset.hdReplaced = "true";
                    }
                }
            }
        }));
        storageManager.getSetting("hoverBigImg", NO).then((hoverBigImg => {
            hoverBigImg === YES && (window.imageHoverPreviewObj ? window.imageHoverPreviewObj.bindEvents() : window.imageHoverPreviewObj = new ImageHoverPreview({
                selector: this.getSelector().coverImgSelector
            }));
        }));
    }
}
// [ListPagePlugin 节选结束]

// ===== [设置面板] SettingPlugin 宿主类中与功能相关的方法 [节选] =====
// [节选] 原类定义于源6815行, 此处仅保留与六个功能相关的HTML生成/回显/change事件/保存逻辑:
class SettingPlugin extends BasePlugin {
    getName() {
        return "SettingPlugin";
    }

    // [节选] 原方法定义于源6900-6925行, 完整HTML模板过长, 此处仅保留与本清单功能相关的变量准备部分:
    // 1) videoQualityHtml: "预览视频默认画质"下拉框(更高画质预览视频功能)的选项HTML;
    // 2) coverButtonPlugin.screenSvg/videoSvg: "封面快捷按钮:长缩略图/预览视频"两个设置项标签中的SVG图标.
    // 原方法其余部分(数据备份/基础配置面板HTML、layer.open弹窗调用等)与六个功能无直接关联, 已省略.
    async openSettingDialog(defaultActivePanel = "backup-panel", fun) {
        let videoQualityHtml = "";
        qualityOptions.forEach((option => {
            option.canSelect && (videoQualityHtml += `<option value="${option.quality}">${option.text}</option>`);
        }));
        const coverButtonPlugin = this.getBean("CoverButtonPlugin");
        return { videoQualityHtml, screenSvg: coverButtonPlugin.screenSvg, videoSvg: coverButtonPlugin.videoSvg };
    }

    async simpleSetting() {
        let settingObj = await storageManager.getSetting();
        const showFilterItemHotKey = settingObj.showFilterItemHotKey, showFilterActorItemHotKey = settingObj.showFilterActorItemHotKey, showFilterKeywordItemHotKey = settingObj.showFilterKeywordItemHotKey, showFavoriteItemHotKey = settingObj.showFavoriteItemHotKey, showHasDownItemHotKey = settingObj.showHasDownItemHotKey, showHasWatchItemHotKey = settingObj.showHasWatchItemHotKey, showAllItemHotKey = settingObj.showAllItemHotKey;
        return `\n             <div class="jhs-scrollbar" style="margin-top:20px;max-height:90vh; overflow-y:auto;">\n                <div style="margin: 0 10px;">\n                    <div class="setting-item">\n                        <span class="setting-label">\n                            显示已鉴定内容:\n                        </span>\n                        <div class="form-content" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end;">\n                            <span style="display:inline-block; width: 100px; font-size:13px; font-weight:bold; text-align: left">屏蔽单番号${showFilterItemHotKey ? `(${showFilterItemHotKey})` : ""}: </span><input type="checkbox" id="showFilterItem" class="mini-switch"><br/>\n                            <span style="display:inline-block; width: 100px; font-size:13px; font-weight:bold; text-align: left">屏蔽演员${showFilterActorItemHotKey ? `(${showFilterActorItemHotKey})` : ""}: </span><input type="checkbox" id="showFilterActorItem" class="mini-switch"><br/>\n                            <span style="display:inline-block; width: 100px; font-size:13px; font-weight:bold; text-align: left">屏蔽关键词${showFilterKeywordItemHotKey ? `(${showFilterKeywordItemHotKey})` : ""}: </span><input type="checkbox" id="showFilterKeywordItem" class="mini-switch"><br/>\n                            <span style="display:inline-block; width: 100px; font-size:13px; font-weight:bold; text-align: left">收藏${showFavoriteItemHotKey ? `(${showFavoriteItemHotKey})` : ""}: </span><input type="checkbox" id="showFavoriteItem" class="mini-switch"><br/>\n                            <span style="display:inline-block; width: 100px; font-size:13px; font-weight:bold; text-align: left">已下载${showHasDownItemHotKey ? `(${showHasDownItemHotKey})` : ""}: </span><input type="checkbox" id="showHasDownItem" class="mini-switch"><br/>\n                            <span style="display:inline-block; width: 100px; font-size:13px; font-weight:bold; text-align: left">已观看${showHasWatchItemHotKey ? `(${showHasWatchItemHotKey})` : ""}: </span><input type="checkbox" id="showHasWatchItem" class="mini-switch"><br/>\n                        </div>\n                    </div>\n                    <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="快速显示所有已鉴定内容,减少对以上开关的频繁操作">❓ </span> 显示所有${showAllItemHotKey ? `(${showAllItemHotKey})` : ""}:\n                        </span>\n                        <div class="form-content" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end;">\n                            <input type="checkbox" id="showAllItem" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                    <hr style="border: 0; height: 1px; margin:10px 0;background-image: linear-gradient(to right, rgba(0,0,0,0), rgba(159,137,137,0.75), rgba(0,0,0,0));"/>\n                    \n                    <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="点击封面的打开方式,弹窗|新窗口">❓ </span>弹窗方式打开页面:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                             <input type="checkbox" id="dialogOpenDetail" class="mini-switch">\n                        </div>\n                    </div>      \n                    \n                    <div class="setting-item">\n                        <span class="setting-label">鉴定后立即关闭页面:</span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="needClosePage" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                    <hr style="border: 0; height: 1px; margin:10px 0;background-image: linear-gradient(to right, rgba(0,0,0,0), rgba(159,137,137,0.75), rgba(0,0,0,0));"/>\n\n                    <div class="setting-item">\n                        <span class="setting-label">\n                             <span data-tip="使用瀑布流模式, 排序方式将调整为默认">❓ </span>瀑布流模式:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="autoPage" class="mini-switch">\n                        </div>\n                    </div>\n       \n                    <div class="setting-item">\n                        <span class="setting-label">启用标题翻译:</span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="translateTitle" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                    <div class="setting-item">\n                        <span class="setting-label">启用悬浮大图:</span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="hoverBigImg" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                                        \n                    <div class="setting-item">\n                        <span class="setting-label">启用115视频匹配: </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="enable115Match" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                    <hr style="border: 0; height: 1px; margin:10px 0;background-image: linear-gradient(to right, rgba(0,0,0,0), rgba(159,137,137,0.75), rgba(0,0,0,0));"/>\n\n                    <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="详情页是否展示女优年龄、三围等信息">❓ </span>加载女优信息:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="enableLoadActressInfo" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                    <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="详情页第三方资源检测,如missAv,123AV">❓ </span>加载第三方视频资源:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="enableLoadOtherSite" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                    <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="详情页图片区首列位置加载长缩略图">❓ </span>加载长缩略图:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="enableLoadScreenShot" class="mini-switch">\n                        </div>\n                    </div>\n                    \n                     <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="详情页解析更多更高画质的预览视频">❓ </span>更高画质预览视频:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="enableLoadPreviewVideo" class="mini-switch">\n                        </div>\n                    </div>\n\n                    <hr style="border: 0; height: 1px; margin:10px 0;background-image: linear-gradient(to right, rgba(0,0,0,0), rgba(159,137,137,0.75), rgba(0,0,0,0));"/>\n\n                    <div class="setting-item">\n                        <span class="setting-label">\n                            <span data-tip="列数6以上,建议开启竖图">❓ </span>竖图模式:\n                        </span>\n                        <div class="form-content" style="text-align: right;">\n                            <input type="checkbox" id="enableVerticalModel" class="mini-switch">\n                        </div>\n                    </div>\n                                    \n                    <div class="setting-item">\n                        <span class="setting-label">页面列数: <span id="showContainerColumns"></span></span>\n                        <div class="form-content">\n                            <input type="range" id="containerColumns" min="2" max="10" step="1" style="padding:5px 0">\n                        </div>\n                    </div>\n                    \n                    <div class="setting-item">\n                        <span class="setting-label">页面宽度: <span id="showContainerWidth"></span></span>\n                        <div class="form-content">\n                            <input type="range" id="containerWidth" min="0" max="30" step="1" style="padding:5px 0">\n                        </div>\n                    </div>\n                </div>\n                <div style="padding: 0 20px 15px; text-align: right; border-top: 1px solid #eee;">   \n                    <button id="helpBtn" style="float:left;">常见问题</button>\n                    <button id="moreBtn">更多设置</button>\n                </div>\n            </div>\n        `;
    }

    async loadForm() {
        let settingObj = await storageManager.getSetting();
        $("#videoQuality").val(settingObj.videoQuality);
        $("#enableScreenSvg").prop("checked", !settingObj.enableScreenSvg || settingObj.enableScreenSvg === YES);
        $("#enableVideoSvg").prop("checked", !settingObj.enableVideoSvg || settingObj.enableVideoSvg === YES);
        $("#dialogOpenDetail").prop("checked", !settingObj.dialogOpenDetail || settingObj.dialogOpenDetail === YES);
        $("#enableLoadActressInfo").prop("checked", !settingObj.enableLoadActressInfo || settingObj.enableLoadActressInfo === YES);
        $("#hoverBigImg").prop("checked", !!settingObj.hoverBigImg && settingObj.hoverBigImg === YES);
        $("#enableLoadScreenShot").prop("checked", !settingObj.enableLoadScreenShot || settingObj.enableLoadScreenShot === YES);
        $("#enableLoadPreviewVideo").prop("checked", !settingObj.enableLoadPreviewVideo || settingObj.enableLoadPreviewVideo === YES);
    }

    // [节选] 原为 initSimpleSettingForm() 方法(源7039-7204行)中与本清单功能相关的片段, 重组为独立方法:
    // A. loadForm回显(源7045/7049/7148行): dialogOpenDetail/enableLoadActressInfo/hoverBigImg等开关状态回显;
    // B. change事件绑定(源7075-7078/7149-7160/7167-7176行): 六个功能开关的保存与联动逻辑.
    bindFeatureSettings(settingObj) {
        // --- A. 表单回显 ---
        $("#dialogOpenDetail").prop("checked", !settingObj.dialogOpenDetail || settingObj.dialogOpenDetail === YES);
        $("#enableLoadActressInfo").prop("checked", !settingObj.enableLoadActressInfo || settingObj.enableLoadActressInfo === YES);
        $("#hoverBigImg").prop("checked", !!settingObj.hoverBigImg && settingObj.hoverBigImg === YES);
        $("#enableLoadScreenShot").prop("checked", !settingObj.enableLoadScreenShot || settingObj.enableLoadScreenShot === YES);
        $("#enableLoadPreviewVideo").prop("checked", !settingObj.enableLoadPreviewVideo || settingObj.enableLoadPreviewVideo === YES);
        // --- B. change事件绑定 ---
        $("#dialogOpenDetail").on("change", (event => {
            let dialogOpenDetail = $("#dialogOpenDetail").is(":checked") ? YES : NO;
            storageManager.saveSettingItem("dialogOpenDetail", dialogOpenDetail);
        }));
        $("#hoverBigImg").on("change", (async event => {
            const hoverBigImg = $("#hoverBigImg").is(":checked") ? YES : NO;
            await storageManager.saveSettingItem("hoverBigImg", hoverBigImg);
            hoverBigImg === YES ? window.imageHoverPreviewObj = new ImageHoverPreview({
                selector: this.getSelector().coverImgSelector
            }) : window.imageHoverPreviewObj && window.imageHoverPreviewObj.destroy();
        }));
        $("#enableLoadActressInfo").on("change", (async event => {
            const enableLoadActressInfo = $("#enableLoadActressInfo").is(":checked") ? YES : NO;
            await storageManager.saveSettingItem("enableLoadActressInfo", enableLoadActressInfo);
            enableLoadActressInfo === YES ? this.getBean("ActressInfoPlugin").loadActressInfo() : $(".actress-info").remove();
        }));
        $("#enableLoadScreenShot").on("change", (async event => {
            const enableLoadScreenShot = $("#enableLoadScreenShot").is(":checked") ? YES : NO;
            await storageManager.saveSettingItem("enableLoadScreenShot", enableLoadScreenShot);
            enableLoadScreenShot === YES ? this.getBean("ScreenShotPlugin").loadScreenShot().then() : $(".screen-container").remove();
        }));
        $("#enableLoadPreviewVideo").on("change", (async event => {
            const enableLoadPreviewVideo = $("#enableLoadPreviewVideo").is(":checked") ? YES : NO;
            await storageManager.saveSettingItem("enableLoadPreviewVideo", enableLoadPreviewVideo);
        }));
    }

    saveFormFieldValues(settingObj) {
        settingObj.videoQuality = $("#videoQuality").val();
        settingObj.enableScreenSvg = $("#enableScreenSvg").is(":checked") ? YES : NO;
        settingObj.enableVideoSvg = $("#enableVideoSvg").is(":checked") ? YES : NO;
    }
}
// [SettingPlugin 节选结束]

// ===== [更高画质预览视频] BusPreviewVideoPlugin(JavBus详情页) (源7619-7722行, 含类声明) =====
class BusPreviewVideoPlugin extends BasePlugin {
    getName() {
        return "BusPreviewVideoPlugin";
    }
    async initCss() {
        return "\n            /* 弹窗/Modal 样式 */\n            .bus-preview-modal {\n                position: fixed;\n                top: 0;\n                left: 0;\n                width: 100%;\n                height: 100%;\n                background-color: rgba(0, 0, 0, 0.95); \n                /* 关键修改：更新 z-index */\n                z-index: 12345699; \n                display: flex;\n                justify-content: center;\n                align-items: center;\n                opacity: 0; \n                visibility: hidden; \n                transition: opacity 0.2s ease;\n            }\n            .bus-preview-modal.is-open {\n                opacity: 1;\n                visibility: visible;\n            }\n            /* 垂直排列视频和按钮，并居中 */\n            .bus-preview-modal-content {\n                position: relative;\n                max-width: 95%; \n                max-height: 95%;\n                display: flex; \n                flex-direction: column; \n                align-items: center; \n                gap: 15px; \n            }\n            \n            /* 移除 .bus-preview-close-btn 的样式 */\n\n            /* 视频播放器容器 */\n            .video-player-wrapper {\n                /* 关键修改：更新 width 和 max-height */\n                width: 80vw; \n                max-height: 85vh; \n                aspect-ratio: 16 / 9; \n                position: relative; \n                background-color: black; \n                max-width: 100%; \n            }\n            /* 视频元素 */\n            .video-player-wrapper #preview-video {\n                position: absolute; \n                top: 0;\n                left: 0;\n                width: 100%;\n                height: 100%;\n                display: block;\n            }\n\n            /* 画质控制盒 (底部按钮) */\n            .video-control-box {\n                display: flex;\n                flex-direction: row; \n                justify-content: center; \n                flex-wrap: wrap; \n                gap: 10px;\n                padding: 10px 0; \n            }\n\n            /* 按钮样式 (保留) */\n            .video-control-btn {\n                min-width:80px;\n                padding: 6px 12px;\n                background: rgba(255,255,255,0.2);\n                color: white;\n                border: 1px solid rgba(255,255,255,0.5);\n                border-radius: 4px;\n                cursor: pointer;\n                text-align: center;\n                font-size: 14px;\n                transition: background-color 0.2s, border-color 0.2s;\n            }\n            .video-control-btn:hover {\n                background: rgba(255,255,255,0.4);\n            }\n            .video-control-btn.active {\n                background-color: #1890ff; \n                color: white;\n                font-weight: bold;\n                border: 1px solid #096dd9;\n            }\n        ";
    }
    initModal() {
        if (0 === $("#bus-preview-modal").length) {
            $("body").append('\n                <div id="bus-preview-modal" class="bus-preview-modal">\n                    <div class="bus-preview-modal-content">\n                        </div>\n                </div>\n            ');
            const $modal = $("#bus-preview-modal");
            $modal.on("click", (e => {
                "bus-preview-modal" === e.target.id && this.closeVideoModal();
            }));
            $(document).on("keydown", (e => {
                "Escape" === e.key && $modal.hasClass("is-open") && this.closeVideoModal();
            }));
        }
    }
    closeVideoModal() {
        const $previewVideo = $("#preview-video");
        $previewVideo.length > 0 && $previewVideo[0].pause();
        $("#bus-preview-modal").removeClass("is-open");
    }
    async handle() {
        if (!isDetailPage) return;
        this.initModal();
        const firstImageSrc = $("#sample-waterfall .sample-box .photo-frame img:first").attr("src"), videoPreview = $(`\n            <a class="preview-video-container sample-box" style="cursor: pointer">\n                <div class="photo-frame" style="position:relative;">\n                    <img src="${firstImageSrc}" class="video-cover" alt="">\n                    <div class="play-icon" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); \n                                color:white; font-size:40px; text-shadow:0 0 10px rgba(0,0,0,0.5);">\n                        ▶\n                    </div>\n                </div>\n            </a>`);
        $("#sample-waterfall").prepend(videoPreview);
        "yes" === await storageManager.getSetting("enableLoadPreviewVideo", "yes") && getDmmVideo(this.getPageInfo().carNum, !1).then();
        let isHandlingVideo = !1, $preview = $(".preview-video-container");
        $preview.on("click", (async event => {
            event.preventDefault();
            event.stopPropagation();
            if (isHandlingVideo) show.info("正在加载中, 勿重复点击"); else {
                isHandlingVideo = !0;
                try {
                    await this.handleVideo();
                } finally {
                    isHandlingVideo = !1;
                }
            }
        }));
        window.location.href.includes("autoPlay=1") && $preview.trigger("click");
    }
    async handleVideo() {
        const $modal = $("#bus-preview-modal"), $modalContent = $modal.find(".bus-preview-modal-content");
        let $previewVideo = $("#preview-video");
        if ($previewVideo.length > 0) {
            $modal.addClass("is-open");
            $previewVideo[0].play().catch((e => console.warn("尝试播放失败 (可能被浏览器阻止):", e)));
            return;
        }
        let carNum2 = this.getPageInfo().carNum;
        const dmmVideoMap = await getDmmVideo(carNum2);
        if (dmmVideoMap && 0 !== Object.keys(dmmVideoMap).length) {
            await this.createVideoPlayerAndControls(dmmVideoMap, $modalContent);
            $previewVideo = $("#preview-video");
            if ($previewVideo.length > 0) {
                $modal.addClass("is-open");
                $previewVideo[0].play().catch((e => console.warn("尝试播放失败 (可能被浏览器阻止):", e)));
            } else show.error("视频播放器创建失败。");
        } else show.error("未找到可用的视频源。");
    }
    async createVideoPlayerAndControls(dmmVideoMap, $container) {
        let defaultVideoQuality = await storageManager.getSetting("videoQuality");
        defaultVideoQuality = selectDefaultQuality(Object.keys(dmmVideoMap), defaultVideoQuality);
        let defaultVideoUrl = dmmVideoMap[defaultVideoQuality];
        $container.html(`\n            <div class="video-player-wrapper">\n                <video id="preview-video" controls playsinline>\n                    <source src="${defaultVideoUrl}" />\n                </video>\n            </div>\n            <div class="video-control-box">\n                </div>\n        `);
        const $videoEl = $("#preview-video"), $previewSource = $videoEl.find("source"), $qualityControlsBox = $container.find(".video-control-box");
        if (!$videoEl.length || !$previewSource.length) return;
        const videoEl = $videoEl[0], jhs_videoMuted = localStorage.getItem("jhs_videoMuted");
        videoEl.muted = !jhs_videoMuted || "yes" === jhs_videoMuted;
        videoEl.addEventListener("volumechange", (function() {
            localStorage.setItem("jhs_videoMuted", videoEl.muted ? "yes" : "no");
        }));
        let buttonsHtml = "";
        qualityOptions.forEach((option => {
            let dmmVideoUrl = dmmVideoMap[option.quality];
            if (dmmVideoUrl) {
                const isActive = defaultVideoQuality === option.quality;
                buttonsHtml += `\n                    <button class="video-control-btn${isActive ? " active" : ""}" \n                            data-quality="${option.quality}"\n                            data-video-src="${dmmVideoUrl}">\n                        ${option.text}\n                    </button>\n                `;
            }
        }));
        $qualityControlsBox.html(buttonsHtml);
        const $buttons = $qualityControlsBox.find(".video-control-btn");
        $qualityControlsBox.off("click").on("click", ".video-control-btn", (async e => {
            try {
                const $button = $(e.currentTarget);
                if ($button.hasClass("active")) return;
                let videoSrc = $button.attr("data-video-src");
                $previewSource.attr("src", videoSrc);
                const currentTime = videoEl.currentTime;
                videoEl.load();
                videoEl.currentTime = currentTime;
                await videoEl.play();
                $buttons.removeClass("active");
                $button.addClass("active");
            } catch (error) {
                console.error("切换画质失败:", error);
            }
        }));
    }
}

// ===== [封面快捷按钮] CoverButtonPlugin(screenSvg长缩略图/videoSvg预览视频按钮及enableSvgBtn开关) (源8089-8266行) =====
class CoverButtonPlugin extends BasePlugin {
    getName() {
        return "CoverButtonPlugin";
    }
    async initCss() {
        return `\n            <style>\n                .box .tags {\n                    justify-content: space-between;\n                }\n                .tool-box span{\n                    opacity:.3\n                }\n                .tool-box span:hover{\n                    opacity:1\n                }\n                ${isJavBus ? ".tool-box .icon, .setting-label .icon{ height: 24px; width: 24px; }" : ""}\n                .tool-box svg path {\n                  fill: blue;\n                }\n                [data-theme="dark"] .tool-box svg path {\n                  fill: white;\n                }\n                \n                [data-theme="dark"] .tool-box .copySvg .more-tools svg path {\n                  fill: black;\n                }\n                \n                \n                /* 鼠标移入时的弹性动画 */\n                .elastic-in {\n                    animation: elasticIn 0.2s ease-out forwards;  /* 动画名称 | 时长 | 缓动函数 | 保持最终状态 */\n                }\n                \n                /* 鼠标移出时的弹性动画 */\n                .elastic-out {\n                    animation: elasticOut 0.2s ease-in forwards;\n                }\n                /* 弹性进入动画（像果冻弹入） */\n                @keyframes elasticIn {\n                    0% {\n                        opacity: 0;\n                        transform: scale(0.8);  /* 起始状态：80% 大小 */\n                    }\n                    50% {\n                        opacity: 1;\n                        transform: scale(1.1);  /* 弹到 110%（超调一点） */\n                    }\n                    70% {\n                        transform: scale(0.95); /* 回弹到 95%（模拟弹性阻尼） */\n                    }\n                    100% {\n                        opacity: 1;\n                        transform: scale(1);    /* 最终恢复正常大小 */\n                    }\n                }\n                /* 弹性离开动画（像果冻弹出） */\n                @keyframes elasticOut {\n                    0% {\n                        opacity: 1;\n                        transform: scale(1);    /* 起始状态：正常大小 */\n                    }\n                    30% {\n                        transform: scale(1.05); /* 先弹大一点（105%） */\n                    }\n                    100% {\n                        opacity: 0;\n                        transform: scale(0.8);  /* 最终缩小并消失 */\n                    }\n                }\n                \n                \n                .loading {\n                    opacity: 0.7;\n                    filter: blur(1px);\n                }\n                .loading-spinner {\n                    position: absolute;\n                    top: 50%;\n                    left: 50%;\n                    transform: translate(-50%, -50%);\n                    width: 40px;\n                    height: 40px;\n                    border: 3px solid rgba(255,255,255,.3);\n                    border-radius: 50%;\n                    border-top-color: #fff;\n                    animation: spin 1s ease-in-out infinite;\n                    z-index: 20;\n                }\n                @keyframes spin {\n                    to { transform: translate(-50%, -50%) rotate(360deg); }\n                }\n            </style>\n        `;
    }
    handle() {
        if (window.isListPage) {
            this.addSvgBtn();
            this.bindClick().then();
        }
    }
    async addSvgBtn() {
        $(this.getSelector().itemSelector).toArray().forEach((ele => {
            let $box2 = $(ele);
            if (!($box2.find(".tool-box").length > 0)) {
                isJavDb && $box2.find(".tags").append(`\n                    <div class="tool-box" style="margin-left: auto; display: flex; align-items: center">\n                        <span class="screenSvg" title="长缩略图" style="margin-right: 15px;">${this.screenSvg}</span>\n                        \n                        <span class="videoSvg" title="播放视频" style="margin-right: 15px;">${this.videoSvg}</span>\n                        \n                        <div class="more-tools-container handleSvg" style="position: relative; margin-right: 15px;">\n                            <div title="鉴定处理" style="padding: 5px; margin: -5px;opacity:.3">${this.handleSvg}</div>\n                            \n                            <div class="more-tools" style=" position: absolute; bottom: 33px; right: -30px; display: none;\n                                background-color: rgba(255, 255, 255, 0);z-index: 10;">\n                                <a class="menu-btn hasWatchBtn" style="background-color:#d7a80c;color:white !important;margin-bottom: 5px"><span style="opacity: 1;">🔍 已观看</span></a>\n                                <a class="menu-btn hasDownBtn" style="background-color:#7bc73b; color:white !important;margin-bottom: 5px"><span style="opacity: 1;">📥️ 已下载</span></a>\n                                <a class="menu-btn favoriteBtn" style="background-color:#25b1dc; color:white !important;margin-bottom: 5px"><span style="opacity: 1;">⭐ 收藏</span></a>\n                                <a class="menu-btn filterBtn" style="background-color:#de3333;   color:white !important;margin-bottom: 5px"><span style="opacity: 1;">🚫 屏蔽</span></a>\n                            </div>\n                        </div>\n                        \n                        <div class="more-tools-container siteSvg"  style="position: relative; margin-right: 15px;">\n                            <div title="第三方网站" style="padding: 5px; margin: -5px;opacity:.3">${this.siteSvg}</div>\n                            \n                             <div class="more-tools" style=" position: absolute; bottom: 33px; right: -30px; display: none;\n                                background-color: rgba(255, 255, 255, 0);z-index: 10;">\n                                <a class="site-btn site-jable" style="color:white !important;margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;">Jable</span>\n                                </a>\n                                <a class="site-btn site-avgle" style="margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;">Avgle</span>\n                                </a>\n                                <a class="site-btn site-miss-av" style="color:white !important;margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;">MissAv</span>\n                                </a>\n                                <a class="site-btn site-123-av" style="color:white !important;margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;">123Av</span>\n                                </a>\n                            </div>\n                        </div>\n                        \n                        <div class="more-tools-container copySvg" style="position: relative; margin-right: 15px;">\n                            <div title="复制按钮" style="padding: 5px; margin: -5px;opacity:.3">${this.copySvg}</div>\n                            \n                            <div class="more-tools" style="\n                                position: absolute;\n                                bottom: 20px;\n                                right: -10px;\n                                display: none;\n                                background: white;\n                                box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n                                border-radius: 20px;\n                                padding: 10px 0;\n                                margin-bottom: 15px;\n                                z-index: 10;\n                            ">\n                                <span class="carNumSvg" title="复制番号" style="padding: 5px 10px; white-space: nowrap;">${this.carNumSvg}</span>\n                                <span class="titleSvg" title="复制标题" style="padding: 5px 10px; white-space: nowrap;">${this.titleSvg}</span>\n                                <span class="downSvg" title="下载封面" style="padding: 5px 10px; white-space: nowrap;">${this.downSvg}</span>\n                            </div>\n                        </div>\n                    </div>\n                `);
                if (isJavBus) {
                    if ($box2.find(".avatar-box").length > 0) return;
                    $box2.find(".photo-info").append(`\n                    <div class="tool-box" style="display: flex; align-items: center;justify-content: flex-end">\n                        <span class="screenSvg" title="长缩略图" style="margin-right: 15px;">${this.screenSvg}</span>\n\n                        <span class="videoSvg" title="播放视频" style="margin-right: 15px;">${this.videoSvg}</span>\n                        \n                        <div class="more-tools-container handleSvg" style="position: relative; margin-right: 15px;">\n                            <div title="鉴定处理" style="padding: 5px; margin: -5px;opacity:.3">${this.handleSvg}</div>\n                            \n                            <div class="more-tools" style=" position: absolute; bottom: 33px; right: -30px; display: none;\n                                background-color: rgba(255, 255, 255, 0);z-index: 10;">\n                                <a class="menu-btn hasWatchBtn" style="background-color:#d7a80c;color:white;margin-bottom: 5px"><span style="opacity: 1;display: inline; color:white !important">🔍 已观看</span></a>\n                                <a class="menu-btn hasDownBtn" style="background-color:#7bc73b; color:white;margin-bottom: 5px"><span style="opacity: 1;display: inline; color:white !important">📥️ 已下载</span></a>\n                                <a class="menu-btn favoriteBtn" style="background-color:#25b1dc; color:white;margin-bottom: 5px"><span style="opacity: 1;display: inline; color:white !important">⭐ 收藏</span></a>\n                                <a class="menu-btn filterBtn" style="background-color:#de3333;   color:white;margin-bottom: 5px"><span style="opacity: 1;display: inline; color:white !important">🚫 屏蔽</span></a>\n                            </div>\n                        </div>\n                        \n                        <div class="more-tools-container siteSvg" style="position: relative; margin-right: 15px;">\n                            <div title="第三方网站" style="padding: 5px; margin: -5px;opacity:.3">${this.siteSvg}</div>\n                            \n                             <div class="more-tools" style=" position: absolute; bottom: 33px; right: -30px; display: none;\n                                background-color: rgba(255, 255, 255, 0);z-index: 10;">\n                                <a class="site-btn site-jable" style="color:white;margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;display: inline; color:white !important">Jable</span>\n                                </a>\n                                <a class="site-btn site-avgle" style="margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;display: inline; color:white !important">Avgle</span>\n                                </a>\n                                <a class="site-btn site-miss-av" style="color:white;margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;display: inline; color:white !important">MissAv</span>\n                                </a>\n                                <a class="site-btn site-123-av" style="color:white;margin-bottom: 5px;background-color:#71bb59;">\n                                    <span style="opacity: 1;display: inline; color:white !important">123Av</span>\n                                </a>\n                            </div>\n                        </div>\n                      \n                        <div class="more-tools-container copySvg" style="position: relative;">\n                            <div title="复制按钮" style="padding: 5px; margin: -5px;opacity:.3">${this.copySvg}</div>\n                            \n                            <div class="more-tools" style="\n                                max-width: 44px;\n                                position: absolute;\n                                bottom: 20px;\n                                right: -10px;\n                                display: none;\n                                background: white;\n                                box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n                                border-radius: 20px;\n                                padding: 10px 0;\n                                margin-bottom: 15px;\n                                z-index: 10;\n                                text-align: center;\n                            ">\n                                <span class="carNumSvg" title="复制番号" style="padding: 5px 10px; white-space: nowrap;display: inline">${this.carNumSvg}</span>\n                                <span class="titleSvg" title="复制标题"  style="padding: 5px 10px; white-space: nowrap;display: inline">${this.titleSvg}</span>\n                                <span class="downSvg" title="下载封面"   style="padding: 5px 10px; white-space: nowrap;display: inline">${this.downSvg}</span>\n                            </div>\n                        </div>\n                    </div>\n                `);
                }
            }
        }));
        this.enableSvgBtn();
    }
    async enableSvgBtn() {
        const settingObj = await storageManager.getSetting(), {enableScreenSvg: enableScreenSvg = YES, enableVideoSvg: enableVideoSvg = YES, enableHandleSvg: enableHandleSvg = YES, enableSiteSvg: enableSiteSvg = YES, enableCopySvg: enableCopySvg = YES} = settingObj;
        [ {
            selector: ".screenSvg",
            enabled: enableScreenSvg
        }, {
            selector: ".videoSvg",
            enabled: enableVideoSvg
        }, {
            selector: ".handleSvg",
            enabled: enableHandleSvg
        }, {
            selector: ".siteSvg",
            enabled: enableSiteSvg
        }, {
            selector: ".copySvg",
            enabled: enableCopySvg
        } ].forEach((({selector: selector, enabled: enabled}) => {
            $(selector).toggle(enabled === YES);
        }));
    }
    async bindClick() {
        this.getSelector();
        const listPagePlugin = this.getBean("ListPagePlugin");
        $(document).on("click", ".more-tools-container", (event => {
            event.preventDefault();
            var $currentTools = $(event.target).closest(".more-tools-container").find(".more-tools");
            $(".more-tools").not($currentTools).stop(!0, !0).removeClass("elastic-in").addClass("elastic-out").hide();
            $currentTools.is(":visible") ? $currentTools.stop(!0, !0).removeClass("elastic-in").addClass("elastic-out").hide() : $currentTools.stop(!0, !0).removeClass("elastic-out").addClass("elastic-in").show();
        }));
        $(document).on("click", (function(event) {
            $(event.target).closest(".more-tools-container").length || $(".more-tools").stop(!0, !0).removeClass("elastic-in").addClass("elastic-out").hide();
        }));
        $(document).on("click", ".videoSvg", (event => {
            event.preventDefault();
            $('.videoSvg[title!="播放视频"]').each(((index, element) => {
                const $otherSvgElement = $(element);
                let $otherBox = $otherSvgElement.closest(".item"), $otherImg = $otherBox.find("img"), {carNum: carNum2} = this.getBoxCarInfo($otherBox);
                this.showImg($otherSvgElement, $otherImg, carNum2);
                $otherSvgElement.html(this.videoSvg).attr("title", "播放视频");
            }));
            const $currentBox = $(event.target).closest(".item"), $svgElement = $currentBox.find(".videoSvg");
            if ("播放视频" === $svgElement.attr("title")) {
                $svgElement.html(this.recoveryVideoSvg).attr("title", "切回封面");
                const {carNum: carNum2} = this.getBoxCarInfo($currentBox);
                let $img = $currentBox.find("img");
                if (!$img.length) {
                    show.error("没有找到图片");
                    return;
                }
                this.showVideo($svgElement, $img, carNum2).then();
            }
        }));
        $(document).on("click", ".screenSvg", (async event => {
            event.preventDefault();
            let loadObj = loading();
            try {
                const $box2 = $(event.currentTarget).closest(".item");
                let {carNum: carNum2} = this.getBoxCarInfo($box2);
                carNum2 = carNum2.replace("FC2-", "");
                const imgUrl = await this.getBean("ScreenShotPlugin").getScreenshot(carNum2);
                loadObj.close();
                showImageViewer(imgUrl);
            } catch (error) {
                console.error("图片预览出错:", error);
                show.error("图片预览出错:" + error);
            } finally {
                loadObj.close();
            }
        }));
        $(document).on("click", ".filterBtn, .favoriteBtn, .hasDownBtn, .hasWatchBtn", (event => {
            event.preventDefault();
            event.stopPropagation();
            const $btn = $(event.target).closest(".menu-btn"), $box2 = $btn.closest(".item"), {carNum: carNum2, url: url, publishTime: publishTime} = this.getBoxCarInfo($box2), handleAction = async status => {
                let actress = await listPagePlugin.parseActressName(url);
                await storageManager.saveCar({
                    carNum: carNum2,
                    url: url,
                    names: actress,
                    actionType: status,
                    publishTime: publishTime
                });
                window.refresh();
                show.ok("操作成功");
            };
            $btn.hasClass("filterBtn") ? utils.q(event, `是否屏蔽${carNum2}?`, (() => handleAction(Status_FILTER))) : $btn.hasClass("favoriteBtn") ? handleAction(Status_FAVORITE).then() : $btn.hasClass("hasDownBtn") ? handleAction(Status_HAS_DOWN).then() : $btn.hasClass("hasWatchBtn") && handleAction(Status_HAS_WATCH).then();
            $(".more-tools").stop(!0, !0).removeClass("elastic-in").addClass("elastic-out").hide();
        }));
        const otherSitePlugin = this.getBean("OtherSitePlugin"), missAvUrl = await otherSitePlugin.getMissAvUrl(), jableUrl = await otherSitePlugin.getjableUrl(), avgleUrl = await otherSitePlugin.getAvgleUrl(), av123Url = await otherSitePlugin.getAv123Url();
        $(document).on("click", ".site-jable, .site-avgle, .site-miss-av, .site-123-av", (event => {
            event.preventDefault();
            event.stopPropagation();
            const $currentTarget = $(event.currentTarget), $box2 = $currentTarget.closest(".item"), {carNum: carNum2} = this.getBoxCarInfo($box2);
            let url = null;
            $currentTarget.hasClass("site-jable") ? url = `${jableUrl}/search/${carNum2}/` : $currentTarget.hasClass("site-avgle") ? url = `${avgleUrl}/vod/search.html?wd=${carNum2}` : $currentTarget.hasClass("site-miss-av") ? url = `${missAvUrl}/search/${carNum2}` : $currentTarget.hasClass("site-123-av") && (url = `${av123Url}/ja/search?keyword=${carNum2}`);
            event && (event.ctrlKey || event.metaKey) ? GM_openInTab(url, {
                insert: 0
            }) : window.open(url);
        }));
        $(document).on("click", ".titleSvg, .carNumSvg, .downSvg", (event => {
            event.preventDefault();
            event.stopPropagation();
            const $box2 = $(event.currentTarget).closest(".item"), {carNum: carNum2, title: title} = this.getBoxCarInfo($box2), $img = $box2.find(isJavBus ? ".photo-frame img" : ".cover img");
            $(event.currentTarget).hasClass("titleSvg") ? utils.copyToClipboard("标题", title) : $(event.currentTarget).hasClass("carNumSvg") ? utils.copyToClipboard("番号", carNum2) : $(event.currentTarget).hasClass("downSvg") && fetch($img.attr("src")).then((response => response.blob())).then((blob => {
                utils.download(blob, carNum2 + " " + title + ".jpg");
            }));
        }));
    }
    showImg($svgElement, $img, carNum2) {
        $svgElement.html(this.videoSvg).attr("title", "播放视频");
        let $video = $(`#${`${carNum2}_preview_video`}`);
        if ($video.length > 0) {
            $video[0].pause();
            $video.parent().hide();
        }
        $img.show();
        $img.removeClass("loading");
        $img.next(".loading-spinner").remove();
    }
    async showVideo($svgElement, $img, carNum2) {
        const id = `${carNum2}_preview_video`;
        let $video = $(`#${id}`);
        if ($video.length > 0) {
            $video.parent().show();
            $video[0].play();
            $img.hide();
            return;
        }
        $img.addClass("loading");
        $img.after('<div class="loading-spinner"></div>');
        const poster = $img.attr("src"), dmmVideoMap = await getDmmVideo(carNum2);
        if (!dmmVideoMap) {
            show.error("未解析到视频");
            this.showImg($svgElement, $img, carNum2);
            return;
        }
        let defaultVideoQuality = await storageManager.getSetting("videoQuality");
        defaultVideoQuality = selectDefaultQuality(Object.keys(dmmVideoMap), defaultVideoQuality);
        let videoUrl = dmmVideoMap[defaultVideoQuality], videoHtml = `\n            <div style="display: flex; justify-content: center; align-items: center; position: absolute; top:0; left:0; height: 100%; width: 100%; z-index: 10; overflow: hidden">\n                <video \n                    src="${videoUrl}" \n                    poster="${poster}" \n                    id="${id}" \n                    controls \n                    loop \n                    muted \n                    playsinline\n                    style="max-height: 100%; max-width: 100%; object-fit: contain"\n                ></video>\n            </div>\n        `;
        isJavBus && (videoHtml = `\n                <div>\n                    <video \n                        src="${videoUrl}" \n                        poster="${poster}" \n                        id="${id}" \n                        controls \n                        loop \n                        muted \n                        playsinline\n                        style="max-height: 100%; max-width: 100%; object-fit: contain"\n                    ></video>\n                </div>\n            `);
        $img.parent().append(videoHtml);
        $img.hide();
        $img.removeClass("loading");
        $img.next(".loading-spinner").remove();
        $video = $(`#${id}`);
        let videoElement = $video[0];
        videoElement.load();
        videoElement.muted = !1;
        videoElement.play();
        $video.trigger("focus");
    }
}

// ===== [加载长缩略图] ScreenShotPlugin(enableLoadScreenShot开关判断+长缩略图加载) (源8821-8924行) =====
class ScreenShotPlugin extends BasePlugin {
    getName() {
        return "ScreenShotPlugin";
    }
    async handle() {
        this.loadScreenShot().then();
    }
    async loadScreenShot() {
        if (!isDetailPage) return;
        if ("yes" !== await storageManager.getSetting("enableLoadScreenShot", "yes")) return;
        let carNum2 = this.getPageInfo().carNum;
        isJavDb && $(".preview-images .tile-item").first().before(' <a class="tile-item screen-container" style="overflow:hidden;max-height: 215px;text-align:center;"><div style="margin-top: 50px;color: #000;cursor: auto">正在加载缩略图</div></a> ');
        isJavBus && $("#sample-waterfall .sample-box:first").after(' <a class="sample-box screen-container" style="overflow:hidden; height: 110px; text-align:center;"><div style="margin-top: 30px;color: #000;cursor: auto">正在加载缩略图</div></a> ');
        try {
            const imgUrl = await this.getScreenshot(carNum2);
            this.addImg("缩略图", imgUrl);
            clog.log("加载缩略图:", imgUrl);
        } catch (e) {
            this.showErrorFallback(carNum2, e);
        }
    }
    async getScreenshot(carNum2) {
        const cacheData = localStorage.getItem("jhs_screenShot") ? JSON.parse(localStorage.getItem("jhs_screenShot")) : {};
        if (cacheData[carNum2]) {
            clog.debug("缓存中存在缩略图:", carNum2, cacheData[carNum2]);
            return cacheData[carNum2];
        }
        let imgUrl;
        try {
            imgUrl = await Promise.any([ this.getJavStoreScreenShot(carNum2) ]);
        } catch (e) {
            clog.error("获取缩略图资源失败:", imgUrl, e);
            throw e;
        }
        if (!imgUrl) {
            this.showErrorFallback(carNum2, null);
            return null;
        }
        const httpsIndex = imgUrl.indexOf("https://");
        -1 !== httpsIndex && (imgUrl = imgUrl.substring(httpsIndex));
        cacheData[carNum2] = imgUrl;
        clog.log("缩略图获取成功:", imgUrl);
        localStorage.setItem("jhs_screenShot", JSON.stringify(cacheData));
        return imgUrl;
    }
    async getJavStoreScreenShot(carNum2) {
        let url = `https://javstore.net/search?q=${carNum2.toLowerCase().replace("fc2-", "")}`;
        clog.log("正在解析缩略图:", url);
        let html = await gmHttp.get(url);
        const $dom = utils.htmlTo$dom(html), tempCarNum = carNum2.toLowerCase().replace(/fc2-(ppv-)?/g, "").replace(/-/g, "");
        let detailPageUrl = null;
        const $itemList = $dom.find("main .grid a");
        for (let i = 0; i < $itemList.length; i++) {
            const href = $($itemList[i]).attr("href") || "";
            if (href.toLowerCase().replace(/fc2-(ppv-)?/g, "").replaceAll("-", "").includes(tempCarNum)) {
                detailPageUrl = new URL(href, "https://javstore.net").href;
                break;
            }
        }
        if (!detailPageUrl) {
            clog.error("JavStore, 查询番号失败:", url);
            return null;
        }
        let detailPageHtml = await gmHttp.get(detailPageUrl);
        const $detailPageDom = utils.htmlTo$dom(detailPageHtml);
        let imgUrl = $detailPageDom.find("a:contains('CLICK HERE')").attr("href") || $detailPageDom.find("img[src*='_s.jpg']").attr("src");
        if (!imgUrl) {
            clog.error("JavStore, 解析预览图失败:", url);
            return null;
        }
        return imgUrl.replace(".th", "");
    }
    addImg(title, imgUrl) {
        if (imgUrl) {
            isJavDb && $(".screen-container").html(`<img src="${imgUrl}" alt="${title}" loading="lazy" style="width: 100%;">`);
            isJavBus && $(".screen-container").html(`<div class="photo-frame"><img src="${imgUrl}" style="height: inherit;width: 100%;" title="${title}" alt="${title}"></div>`);
            $(".screen-container").on("click", (event => {
                event.stopPropagation();
                event.preventDefault();
                showImageViewer(event.currentTarget);
            }));
        }
    }
    showErrorFallback(carNum2, error) {
        var _a2;
        console.error("获取缩略图失败:", null == (_a2 = null == error ? void 0 : error.message) ? void 0 : _a2.substring(0, 100));
        let differentCss = isJavBus ? "margin-top: 30px" : "margin-top: 50px";
        $(".screen-container").html(`<div style="${differentCss}; cursor:auto;color:#000;">获取缩略图失败</div><br/><a href='#' class='retry-link'>点击重试</a> 或 <a class="check-link" href='https://javstore.net/search?q=${carNum2}' target='_blank'>前往确认</a>`).off("click", ".retry-link").off("click", ".check-link").on("click", ".retry-link", (async e => {
            e.stopPropagation();
            e.preventDefault();
            $(".screen-container").html(`<div style="${differentCss};cursor:auto;color:#000;">正在重新加载...</div>`);
            try {
                const imgUrl = await this.getScreenshot(carNum2);
                this.addImg("缩略图", imgUrl);
            } catch (err) {
                this.showErrorFallback(carNum2, err);
            }
        })).on("click", ".check-link", (async e => {
            e.stopPropagation();
            e.preventDefault();
            window.open(`https://javstore.net/search?q=${carNum2}`, "_blank");
        }));
    }
}

// ===== [弹窗打开页面] layer.close/layer.open全局补丁(滚动锁定+ESC关闭) (源10238-10260行) =====
const originalLayerClose = layer.close;

layer.close = function(index) {
    const result = originalLayerClose.call(this, index);
    !function(waitTime = 10) {
        setTimeout((() => {
            const openLayerCount = document.querySelectorAll(".layui-layer-shade").length;
            document.documentElement.style.overflow = openLayerCount > 0 ? "hidden" : "";
        }), waitTime);
    }();
    return result;
};

const originalLayerOpen = layer.open;

layer.open = function(options) {
    const originalSuccess = (options = options || {}).success;
    options.success = function(layero, index) {
        "function" == typeof originalSuccess && originalSuccess.call(this, layero, index);
        utils.setupEscClose(index);
    };
    return originalLayerOpen.call(this, options);
};

// ===== [注册] 相关插件注册(源10269-10335行, 仅保留与本清单六个功能相关的条目) =====
const pluginManager = function() {
    const pluginManager2 = new PluginManager;
    unsafeWindow.pluginManager = window.pluginManager = pluginManager2;
    if (isJavDb) {
        pluginManager2.register(ListPagePlugin);      // bindClick(弹窗方式打开页面)/replaceHdImg(悬浮大图)宿主
        pluginManager2.register(SettingPlugin);       // 六个功能的设置开关宿主
        pluginManager2.register(CoverButtonPlugin);   // 封面快捷按钮: 长缩略图/预览视频
        pluginManager2.register(PreviewVideoPlugin);  // 更高画质预览视频(JavDB详情页)
        pluginManager2.register(ActressInfoPlugin);   // 加载女优信息
        pluginManager2.register(ScreenShotPlugin);    // 加载长缩略图
    }
    if (isJavBus) {
        pluginManager2.register(ListPagePlugin);
        pluginManager2.register(SettingPlugin);
        pluginManager2.register(CoverButtonPlugin);
        pluginManager2.register(BusPreviewVideoPlugin); // 更高画质预览视频(JavBus详情页)
        pluginManager2.register(ActressInfoPlugin);
        pluginManager2.register(ScreenShotPlugin);
    }
    return pluginManager2;
}();
