/* =========================================================
   Livii不動産 物件データ
   物件を追加するときは、下の sale（売買）または rent（賃貸）の
   [ ] の中に { ... }, をひとつ書き足してください。
   書き方の詳細は HP/CLAUDE.md の「物件の追加」を参照。

   status（状態）
     売買: "販売中" / "商談中" / "成約済"
     賃貸: "募集中" / "申込あり" / "成約済"
   sample: true の物件は「掲載例」として表示されます。
   本物の物件を載せたら、sample の物件は削除してください。
   ========================================================= */

window.LIVII_PROPERTIES = {
  sale: [
    {
      id: "S-0001",
      sample: true,
      status: "販売中",
      type: "中古戸建",
      title: "荒尾市 庭付き2階建て",
      price: "1,980万円",
      address: "熊本県荒尾市○○町",
      access: "JR荒尾駅 車で5分",
      layout: "4LDK",
      land: "198.50㎡",
      building: "105.20㎡",
      built: "2008年3月",
      features: ["駐車場2台", "南向き", "リフォーム相談可"],
      image: "sample-sale.jpg",
      note: "取引態様：媒介"
    }
  ],

  rent: [
    {
      id: "R-0001",
      sample: true,
      status: "募集中",
      type: "アパート",
      title: "荒尾市 2LDK アパート",
      rent: "5.8万円",
      fee: "管理費 3,000円",
      deposit: "敷金 1ヶ月／礼金 なし",
      address: "熊本県荒尾市○○",
      access: "JR荒尾駅 徒歩15分",
      layout: "2LDK",
      area: "52.80㎡",
      built: "2015年4月",
      features: ["駐車場1台込", "ペット相談", "エアコン付"],
      image: "sample-rent.jpg",
      note: "取引態様：媒介"
    }
  ]
};
