// ============================================================================
// 从 JAV-JHS-3.3.6.030.user.js 中提取的以下功能的完整相关代码：
//   1. 弹窗方式打开页面 (dialogOpenDetail)
//      - SettingPlugin 设置项 -> ListPagePlugin.bindClick() -> utils.openPage(layer iframe 弹窗)
//      - ESC 关闭: setupEscClose / _handleGlobalEscKey / layer.close+open 补丁
//   2. 悬浮大图 (hoverBigImg)
//      - ImageHoverPreview 类 + ListPagePlugin 中的初始化绑定 + SettingPlugin 开关
//      - 配套: replaceHdImg(高清封面替换, 供 hover 的 data-full/src 使用)
//   3. 加载女优信息 (enableLoadActressInfo) -> ActressInfoPlugin (详情页+演员页)
//   4. 加载长缩略图 (enableLoadScreenShot) -> ScreenShotPlugin (javstore.net 解析+缓存)
//      - 封面快捷按钮"长缩略图"(screenSvg) 点击 -> CoverButtonPlugin -> showImageViewer(viewerjs)
//   5. 更高画质预览视频 (enableLoadPreviewVideo)
//      - DmmVideoFetcher/getDmmVideo (FANZA API 多画质解析+缓存)
//      - PreviewVideoPlugin(JavDB详情页) / BusPreviewVideoPlugin(JavBus详情页)
//      - 封面快捷按钮"预览视频"(videoSvg) -> CoverButtonPlugin.showVideo 内嵌播放
//
// 每段代码均标注了原文件行号范围(基于 JAV-JHS-3.3.6.030.user.js)。
// 依赖说明见文末注释。原文为打包压缩后的产物，此处按原样整段提取，未改写逻辑。
// ============================================================================

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

// ---------------------------------------------------------------------------
// [基础] 站点判断/状态常量/画质配置表 qualityOptions —— 原文件第 82~142 行
// (更高画质预览视频的画质列表、JavDB/JavBus判断均依赖此处)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// [基础] StorageManager 存储管理器(设置项读写: getSetting/saveSettingItem/saveSetting)
// 以上所有功能的开关(dialogOpenDetail/hoverBigImg/enableLoadActressInfo/
// enableLoadScreenShot/enableLoadPreviewVideo/enableScreenSvg/enableVideoSvg/videoQuality)
// 都通过它持久化到 IndexedDB(localforage) —— 原文件第 202~644 行
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// [基础] Utils 工具类 —— 原文件第 778~1195 行 (实例化于 1197)
//   功能相关方法: openPage/setupEscClose/_handleGlobalEscKey(弹窗方式打开页面),
//   getResponsiveArea/q/loopDetector/isHidden/htmlTo\$dom/copyObj/importResource 等
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// [基础] gmHttp 网络请求封装 —— 原文件第 1199~1348 行
//   (女优信息维基查询、长缩略图javstore解析、DMM API 搜索均依赖 gmHttp.get)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// [基础] storageManager 全局实例 —— 原文件第 1350 行
// ---------------------------------------------------------------------------
unsafeWindow.storageManager = window.storageManager = new StorageManager;

// ---------------------------------------------------------------------------
// [公共UI] loading 加载动画(遮罩+关闭按钮) —— 原文件第 1429~1487 行
//   (封面快捷按钮-长缩略图/预览视频点击时的加载态)
// ---------------------------------------------------------------------------
}();

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

// ---------------------------------------------------------------------------
// [公共UI] show 消息提示(Toastify封装) —— 原文件第 1489~1552 行
//   ("图片预览出错"/"未解析到视频"等提示)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// [长缩略图] showImageViewer —— viewerjs 全屏看图封装 —— 原文件第 1554~1668 行
//   (封面快捷按钮"长缩略图"与详情页长缩略图点击后的大图查看)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// [悬浮大图] ImageHoverPreview 完整类 —— 原文件第 1554~1668 行? 否——见下
// ---------------------------------------------------------------------------
