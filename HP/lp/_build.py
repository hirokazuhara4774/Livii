"""事業別 LP（広告・SNS 用）を書き出す。

使い方: HP フォルダで `python3 lp/_build.py` を実行すると、
下の LPS の内容から lp/<slug>/index.html を作り直す。
文章を直すときは、HTML ではなくこのファイルの LPS を直して再実行する。
"""
import pathlib
import re

HP = pathlib.Path(__file__).resolve().parent.parent
TEL = "070-4386-0745"
TEL_LINK = "tel:07043860745"
LINE = "https://line.me/ti/p/kCJGlQU2Ja"
MAIL = "info@livii.jp"
ADDRESS = "〒864-0031 熊本県荒尾市川登1916-5 101"

# 経営理念（総合トップと同じ文言）
MISSION = "地域の「困った」を解決し、誰もが安心して暮らせる環境を創る。"
VALUE = "お客様に寄り添い、自ら考え、最善の提案・行動・誠意を示す。"

LIVII_FLOW = [
    ("無料相談", "電話・メール・LINEでお気軽に。"),
    ("現地確認", "現地を拝見し、ご要望とご予算を伺います。"),
    ("見積もり比較", "2社以上の見積もりを並べ、内容を整理してご提案。"),
    ("ご契約・施工", "見積もりにない追加工事は行いません。"),
    ("アフターフォロー", "工事後も、住まいのことはなんでもご相談ください。"),
]
ESTATE_FLOW = [
    ("ご相談", "ご事情と、お考えのことを伺います。"),
    ("物件の確認", "現地を確認し、相場や状態を調べます。"),
    ("方法のご提案", "価格・時期・費用を整理し、方法をご提案します。"),
    ("ご契約", "ご納得いただいてから、契約の手続きに進みます。"),
    ("その後もサポート", "お引き渡し後・入居後も、ご相談をお受けします。"),
]

VOICES = {
    "sugimoto": ("外構工事", "困っていることを相談したところ、すぐに電話対応してもらい、その日のうちに現場で見積もり、次の日には施工まで行っていただきました。紹介された外構業者さんもとても丁寧で、細かく確認しながら施工していただきました。", "杉本 祐貴 様"),
    "yadorigi": ("店舗づくり", "お店作りをお願いしました。いろいろとすぐに対応してくださり、こちらの要望にも親身になって受けてくださいました。何かあれば相談できる存在がいるととても安心できます。無事オープンできました。", "ヤドリギ 様"),
    "hamasaki": ("外壁・塗装", "実家の外壁工事・塗装を依頼しました。対応も迅速で、すぐ見積もりしていただきました。職人さんも気さくな方で、仕事は丁寧、大変満足です。翌日の作業内容も伝えてくださったので、車の出し入れも問題なくできました。", "濱崎 かおり 様"),
}

LPS = [
    # ---------------- Livii（住まいを整える） ----------------
    dict(
        slug="gaiko", brand="reform", service="外構工事", icon="i-fence",
        title="熊本の外構工事・外構リフォーム｜Livii",
        h1=["暮らしに合う外構を、", "納得の価格で。"],
        lead="カーポート・フェンス・ウッドデッキ・駐車場・アプローチ。熊本県内の新築外構から外構リフォームまで、2社以上の見積もりを比べてご提案します。",
        photo="exterior.jpg", alt="芝生とアプローチのある住宅の外構",
        worries=["外構にかける金額をできるだけ抑えたい", "駐車場をもう1台分増やしたい", "道路からの視線が気になる", "新築の外構をどこに頼めばいいか分からない", "見積もりの金額が適正か分からない", "小さな工事でも頼めるか不安"],
        reasons=[("見積もりは2社以上で比較", "複数社の見積もりを並べ、内容と価格を比べてから選べます。"), ("使いやすさまで考えたプラン", "デザインだけでなく、毎日の使いやすさも重視してご提案します。"), ("小さな工事から対応", "フェンス1枚、駐車場の一部など、小さな工事もお気軽に。")],
        menu=[("カーポート", "雨の日の乗り降りもラクに。"), ("フェンス・目隠し", "道路や隣家からの視線を和らげます。"), ("ウッドデッキ", "庭とリビングをつなぐ、くつろぎの場所に。"), ("駐車場・土間コンクリート", "駐車スペースの拡張や舗装。"), ("アプローチ・門まわり", "家の顔になる玄関までの道を整えます。"), ("お庭づくり", "ご家族の暮らしに合わせたお庭をご提案。")],
        flow=LIVII_FLOW, voice="sugimoto",
        faq=[("小さな工事でも対応してもらえますか？", "はい。フェンスの一部や駐車場の一部など、小さな工事からご相談ください。"), ("新築の外構もお願いできますか？", "はい。新築外構から、今のお住まいの外構リフォームまで対応しています。"), ("自分で取った見積もりがあっても相談できますか？", "もちろんです。お手元の見積もりと比べていただいて構いません。")],
        cta="外構工事を相談する",
    ),
    dict(
        slug="reform", brand="reform", service="リフォーム工事", icon="i-reform",
        title="熊本のリフォーム工事・店舗内装｜Livii",
        h1=["予算の中で、", "満足できるリフォームを。"],
        lead="キッチン・お風呂などの水まわりから、内装、店舗づくりまで。現地を見て、ご予算を超えない、無駄のないプランをご提案します。",
        photo="kitchen.jpg", alt="白を基調にしたキッチン",
        worries=["キッチンやお風呂が古くなってきた", "予算内でどこまでできるか知りたい", "何から手を付ければいいか分からない", "見積もりの後で追加費用が出ないか不安", "お店の内装をつくりたい", "複数の会社を比べる時間がない"],
        reasons=[("現地を見てから正確に", "リフォームは現地を見ないと正確な金額が出ません。必ず確認してからお見積もりします。"), ("見積もりは2社以上で比較", "業者探しと相見積もりはLiviiが代わりに。比べてから選べます。"), ("お店づくりもおまかせ", "住まいだけでなく、店舗の内装づくりもご相談いただけます。")],
        menu=[("キッチン", "使い勝手とお手入れのしやすさを両立。"), ("浴室・トイレ・洗面", "水まわりをまとめて新しく。"), ("内装", "床・壁紙・建具の張り替えなど。"), ("店舗の内装", "開業・改装のご相談も。"), ("小さな修繕", "気になる1か所から対応します。")],
        flow=LIVII_FLOW, voice="yadorigi",
        faq=[("どこまで直すか決まっていなくても大丈夫ですか？", "大丈夫です。ご予算と気になっているところを伺い、優先順位を一緒に考えます。"), ("見積もりのあとに追加費用はかかりますか？", "見積もりに記載のない追加工事は行いません。"), ("店舗の内装もお願いできますか？", "はい。開業前の内装づくりや改装もご相談ください。")],
        cta="リフォームを相談する",
    ),
    dict(
        slug="gaiheki", brand="reform", service="外壁塗装", icon="i-roller",
        title="熊本の外壁塗装・屋根塗装｜Livii",
        h1=["そろそろ塗り替え時？", "まずは外壁の状態から。"],
        lead="外壁や屋根の状態を確認し、ご予算に合わせて最適な塗り替えをご提案します。大切なお住まいを長く守るお手伝いをします。",
        photo="paint.jpg", alt="ローラーで壁を塗る様子",
        worries=["外壁の色あせが気になる", "ひび割れやはがれがある", "前回の塗装からだいぶ年数がたった", "塗装の相場が分からない", "訪問業者に急がされて不安", "工事中のご近所への配慮が心配"],
        reasons=[("状態を確認してからご提案", "外壁・屋根の状態を見て、本当に必要な工事だけをご提案します。"), ("見積もりは2社以上で比較", "塗料や工程の違いも含めて、比べてから選べます。"), ("工事中も安心", "作業内容を事前にお伝えしながら進めます。")],
        menu=[("外壁塗装", "色あせ・汚れを一新し、外壁を守ります。"), ("屋根塗装", "見えにくい屋根も点検してご提案。"), ("ひび割れ補修", "塗装前の下地補修も丁寧に。"), ("付帯部の塗装", "雨どい・破風など細かな部分まで。")],
        flow=LIVII_FLOW, voice="hamasaki",
        faq=[("塗り替えが必要か見てもらうだけでもいいですか？", "はい。状態を確認し、まだ不要であればそうお伝えします。"), ("色選びも相談できますか？", "はい。周りの景観やお好みに合わせて一緒に選びます。"), ("工事中は車を出せますか？", "作業内容と時間を事前にお伝えするので、予定を立てやすくなります。")],
        cta="外壁塗装を相談する",
    ),
    dict(
        slug="kaitai", brand="reform", service="解体・造成工事", icon="i-helmet",
        title="熊本の解体工事・造成工事｜Livii",
        h1=["解体・造成の見積もり、", "あとから増えない安心を。"],
        lead="解体・造成は、業者によって金額が大きく違います。見積もりに記載のない追加工事は行いません。",
        photo="site.jpg", alt="工事現場で打ち合わせをする作業チーム",
        worries=["解体費用の相場が分からない", "あとから追加請求されないか不安", "空き家を解体するか迷っている", "土地を売る前に更地にしたい", "ご近所への挨拶や配慮が心配", "解体後の土地の使い方も相談したい"],
        reasons=[("追加工事は行いません", "見積もりに書いていない工事を、あとから請求することはありません。"), ("見積もりは2社以上で比較", "業者によって大きく違う解体費用を、比べてから決められます。"), ("解体後のことまで相談できる", "更地にしたあとの売却や活用は、Livii不動産でご相談いただけます。")],
        menu=[("建物の解体", "木造住宅・空き家などの解体。"), ("造成工事", "土地の整地・造成。"), ("付帯物の撤去", "ブロック塀・物置・庭木など。"), ("解体後の整地", "次の使い道に合わせて整えます。")],
        flow=LIVII_FLOW, voice=None,
        faq=[("見積もりのあとに費用が増えることはありますか？", "見積もりに記載のない追加工事は行いません。"), ("空き家を解体するか、そのまま売るか迷っています。", "解体した場合と、そのまま売る場合の費用と手残りを比べてご提案します。"), ("ご近所への挨拶はしてもらえますか？", "工事前のご挨拶についてもご相談ください。")],
        cta="解体・造成を相談する",
    ),
    dict(
        slug="solar", brand="reform", service="太陽光・蓄電池", icon="i-solar",
        title="熊本の太陽光発電・蓄電池の相談｜Livii",
        h1=["電気代が気になったら、", "訪問販売の前にご相談を。"],
        lead="「家を建てたときに付けておけばよかった」という方へ。ご家庭に合った太陽光発電・蓄電池の導入を、一緒に考えます。",
        photo="solar.jpg", alt="住宅の屋根に太陽光パネルを設置する様子",
        worries=["電気代が上がって困っている", "太陽光を付けるといくらかかるか知りたい", "訪問販売で勧められて迷っている", "蓄電池も必要か分からない", "うちの屋根に載せられるか分からない", "停電への備えが気になる"],
        reasons=[("訪問販売ではありません", "その場で契約を迫ることはありません。納得いくまでご検討ください。"), ("見積もりは2社以上で比較", "メーカーや工事内容の違いを並べて比べられます。"), ("ご家庭に合ったご提案", "電気の使い方や屋根の状態に合わせてご提案します。")],
        menu=[("太陽光パネルの設置", "屋根の状態を確認してからご提案。"), ("蓄電池の設置", "停電への備えや、電気の使い方に合わせて。"), ("見積もりのセカンドオピニオン", "他社で受けた見積もりの比較もどうぞ。"), ("屋根の点検", "設置前に屋根の状態を確認します。")],
        flow=LIVII_FLOW, voice=None,
        faq=[("訪問販売で受けた見積もりを見てもらえますか？", "はい。内容と金額を一緒に確認し、ほかの見積もりと比べられるようにします。"), ("蓄電池だけの設置もできますか？", "ご家庭の状況を伺ってご提案します。"), ("古い屋根でも載せられますか？", "屋根の状態を確認してから判断します。必要に応じて屋根の補修もご相談ください。")],
        cta="太陽光・蓄電池を相談する",
    ),
    dict(
        slug="kagu", brand="reform", service="家具の新調", icon="i-sofa", two_quotes=False,
        title="大川家具を特約店価格で｜Livii",
        h1=["いい家具を、", "特約店価格で。"],
        lead="家具の名産地・大川家具の各社と特約店契約。通常売価より40〜50%ほどお安くご購入いただけます。",
        photo="sofa.jpg", alt="緑のソファ",
        worries=["新居に合う家具をそろえたい", "いい家具を安く手に入れたい", "ソファやダイニングを買い替えたい", "どこで買えば安いか分からない"],
        reasons=[("大川家具の特約店", "家具の名産地・大川の家具メーカー各社と特約店契約を結んでいます。"), ("通常売価より40〜50%ほどお安く", "特約店価格で、いい家具をお求めやすく。"), ("住まいのことも一緒に", "新築・リフォームに合わせた家具選びもご相談ください。")],
        menu=[("ソファ", "リビングの主役を、特約店価格で。"), ("ダイニング", "テーブル・チェアのセットも。"), ("ベッド・収納家具", "寝室や収納まわりも。"), ("新築・リフォームに合わせて", "間取りに合う家具選びをお手伝い。")],
        flow=[("ご相談", "欲しい家具やご予算を伺います。"), ("家具選び", "メーカーや商品をご紹介します。"), ("お見積もり", "特約店価格でお見積もりします。"), ("ご注文", "ご納得いただいてからご注文。"), ("お届け", "お届けの日程をご案内します。")],
        voice=None,
        faq=[("どんな家具を選べますか？", "大川家具のメーカー各社の商品からお選びいただけます。ご希望を伺ってご紹介します。"), ("どのくらい安くなりますか？", "商品によりますが、通常売価より40〜50%ほどお安くご購入いただけます。"), ("家を建てる予定ですが、相談できますか？", "はい。間取りに合わせた家具選びもお手伝いします。")],
        cta="家具の新調を相談する",
    ),
    dict(
        slug="komarigoto", brand="reform", service="住まいのお困りごと", icon="i-grass", two_quotes=False,
        title="熊本・荒尾の草刈り・不用品回収・ハウスクリーニング｜Livii",
        h1=["草刈り、片付け、掃除。", "住まいの困りごと、まとめて。"],
        lead="お庭の草刈りや不用品回収、ハウスクリーニング、引越しなど。日常のちょっとした困りごとも、まずはご相談ください。",
        photo="cleaning.jpg", alt="窓を掃除する様子",
        worries=["草刈りしないといけないけど面倒", "不用品がたまって片付かない", "引越し前後の掃除が大変", "実家の片付けを手伝ってほしい", "高いところの掃除ができない", "どこに頼めばいいか分からない"],
        reasons=[("窓口はひとつ", "草刈りも片付けも掃除も、まとめてご相談いただけます。"), ("地元・荒尾から", "熊本・荒尾を拠点に、地域の困りごとに向き合います。"), ("その先のご相談も", "修繕や売却など、住まいのことはなんでもつなぎます。")],
        menu=[("草刈り", "お庭や空き地の草刈り。"), ("不用品回収", "家具や家電など、たまった不用品を回収。"), ("ハウスクリーニング", "引越し前後や、年末の大掃除にも。"), ("引越し", "引越しのご相談もどうぞ。")],
        flow=[("ご相談", "お困りごとを伺います。"), ("内容の確認", "必要に応じて現地を確認します。"), ("お見積もり", "作業内容と金額をお伝えします。"), ("作業", "ご都合に合わせて伺います。"), ("完了確認", "仕上がりを一緒に確認します。")],
        voice=None,
        faq=[("草刈りだけでも頼めますか？", "はい。お庭や空き地の草刈りだけでもご相談ください。"), ("実家が遠くて行けないのですが。", "ご事情を伺い、作業の様子のお伝え方も含めてご相談に応じます。"), ("どんなことまで頼めますか？", "住まいのことなら、まずはお気軽にご相談ください。")],
        cta="お困りごとを相談する",
    ),
    # ---------------- Livii不動産（住まいをつなぐ） ----------------
    dict(
        slug="baibai", brand="estate", service="不動産の売買", icon="i-key",
        title="熊本・荒尾の不動産売却・購入｜Livii不動産",
        h1=["家を売る。", "その判断に、納得を。"],
        lead="売る時期、価格、必要な費用。ご事情を整理し、売却の進め方をご提案します。土地や住み替え先の購入のご相談もお受けします。",
        photo="house.jpg", alt="庭のある住宅の外観",
        worries=["いくらで売れるのか、相場が分からない", "売るのは今がいいのか、待つべきか", "相続した実家をどうするか決められない", "住み替えは、売るのと買うのどちらが先？", "手数料や税金を引くと、いくら残るのか", "古い家のままでも売れるのか"],
        reasons=[("価格の根拠をご説明", "査定額だけでなく、周辺の取引事例や物件の評価など、その根拠をお伝えします。"), ("無理のないスケジュール", "住み替えや相続などのご事情に合わせて、売る時期を一緒に決めます。"), ("費用と手残りまで見える化", "仲介手数料・登記・税金を差し引いて、手元に残る金額をお伝えします。")],
        menu=[("売却の査定", "価格の根拠とあわせてお伝えします。"), ("相続した家の売却", "手続きの順番から整理します。"), ("住み替え", "売る・買うの順番もご相談ください。"), ("空き家の売却", "そのまま・解体・修繕を比べてご提案。"), ("土地・住宅の購入", "土地探しや住み替え先探しも。")],
        flow=ESTATE_FLOW, voice=None, listings="sale",
        faq=[("売ると決めていなくても相談できますか？", "はい。決めるための材料をそろえるところから、お手伝いします。"), ("相談や査定に費用はかかりますか？", "ご相談・査定は無料です。仲介手数料は、契約が成立したときにのみいただきます。"), ("古い家でも売れますか？", "そのまま売る、解体して土地として売る、修繕してから売るなどの方法を、費用と手残りで比べてご提案します。")],
        cta="売買について相談する",
    ),
    dict(
        slug="chintai", brand="estate", service="賃貸の仲介", icon="i-building",
        title="熊本・荒尾の賃貸仲介（入居者募集・お部屋探し）｜Livii不動産",
        h1=["貸したい方と、", "住みたい方をつなぐ。"],
        lead="空室の入居者募集から、お部屋探しまで。地元熊本・荒尾で、条件に合う出会いをお手伝いします。",
        photo="apt-room.jpg", alt="明るい賃貸住宅の室内",
        worries=["空室がなかなか埋まらない", "家賃をいくらにすればいいか分からない", "空き家を貸せるか知りたい", "荒尾周辺でお部屋を探している", "条件に合う部屋が見つからない", "契約の手続きがよく分からない"],
        reasons=[("地元・荒尾で", "地域の相場や暮らしをよく知る立場で、ご提案します。"), ("宅地建物取引士が担当", "契約の手続きまで、資格を持つ担当者がご案内します。"), ("貸す前の修繕もまとめて", "貸し出す前の修繕・クリーニングは、Liviiで見積もりを比べて手配できます。")],
        menu=[("賃料設定のご相談", "周辺の相場を調べてご提案。"), ("入居者の募集", "空室や、これから貸す物件の募集。"), ("内見のご案内", "ご希望に合わせて日程を調整。"), ("入居審査・契約", "契約の手続きまでご案内。"), ("お部屋探し", "エリア・家賃・間取りのご希望を伺います。"), ("入居後のご相談", "暮らし始めてからのお困りごとも。")],
        flow=ESTATE_FLOW, voice=None, listings="rent",
        faq=[("空き家でも貸せますか？", "建物の状態を確認し、必要な修繕と家賃の見込みを比べてご提案します。"), ("家賃はどうやって決めますか？", "周辺の相場や物件の条件を調べて、一緒に決めます。"), ("お部屋探しだけの相談でもいいですか？", "はい。ご希望の条件を伺い、合うお部屋をご紹介します。")],
        cta="賃貸について相談する",
    ),
    dict(
        slug="kanri", brand="estate", service="収益物件の管理", icon="i-building",
        title="熊本・荒尾のアパート管理・収益物件の管理｜Livii不動産",
        h1=["アパートの管理、", "まるごとお任せください。"],
        lead="家賃管理、クレーム対応、月ごとの清掃、建物管理。入居者が気持ちよく暮らせる建物にし、入居率アップを目指します。",
        photo="apartment.jpg", alt="集合住宅の外観",
        worries=["家賃の入金確認や督促が負担", "入居者からの連絡に対応しきれない", "共用部の清掃が行き届かない", "蛍光灯切れなどの小さな不具合が気になる", "空室が増えてきた", "遠方に住んでいて物件を見に行けない"],
        reasons=[("毎月の清掃で、きれいな建物に", "入居者が長く住み続けたくなる環境づくりを続けます。"), ("連絡の窓口はひとつ", "家賃・クレーム・不具合のご連絡を、まとめてお受けします。"), ("修繕は見積もりを比べて", "原状回復や修繕は、Liviiで見積もりを比べて手配します。")],
        menu=[("家賃管理", "入金の確認、滞納時の連絡・督促、オーナー様への送金とご報告。"), ("クレーム対応", "騒音・ゴミ出し・駐車場などのトラブルや、設備不具合の窓口。"), ("月ごとの清掃", "廊下・階段・ゴミ置き場の清掃、敷地内の草刈り。"), ("建物管理", "蛍光灯・電球の交換、設備の点検と修繕の手配。"), ("入居者の募集", "空室が出たら、賃貸の仲介と連動して募集。"), ("退去の立ち会い・原状回復", "退去後の確認から修繕の手配まで。")],
        flow=[("ご相談", "物件の状況やお困りごとを伺います。"), ("物件の確認", "建物と入居状況を確認します。"), ("管理内容のご提案", "必要な業務と管理料をご提案します。"), ("管理委託のご契約", "ご納得いただいてから契約します。"), ("管理開始・定期報告", "建物や入居の状況をご報告します。")],
        voice=None,
        faq=[("アパート1棟だけでも管理をお願いできますか？", "はい、ご相談ください。建物の状態や入居状況を伺ったうえで、管理の内容をご提案します。"), ("清掃だけ、家賃管理だけ、のように部分的に頼めますか？", "物件の状況を伺ってご提案します。お気軽にご相談ください。"), ("遠方に住んでいても大丈夫ですか？", "建物や入居の状況を定期的にご報告します。")],
        cta="管理について相談する",
    ),
]


def sprite():
    """アイコン定義は Livii不動産のページ（いちばん多くそろっている）から流用する。"""
    s = (HP / "fudosan" / "index.html").read_text()
    start = s.index("<!-- アイコン定義 -->")
    end = s.index("</defs></svg>", start) + len("</defs></svg>")
    return s[start:end]


def ic(name):
    return f'<svg class="ic"><use href="#{name}"/></svg>'


def page(lp, icons):
    reform = lp["brand"] == "reform"
    theme = "t-reform" if reform else "t-estate"
    brand_name = "Livii" if reform else "Livii<small>不動産</small>"
    brand_desc = "住宅に関わること全般の相談窓口" if reform else "熊本・荒尾の売買・賃貸・管理"
    brand_home = "../../reform/" if reform else "../../fudosan/"
    two_quotes = lp.get("two_quotes", reform)

    if reform:
        chips = ["相談無料"] + (["見積もりは2社以上"] if two_quotes else []) + ["最安に挑戦", "プラス1のサービス"]
    else:
        chips = ["宅地建物取引士が担当", "費用と手残りまで説明", "迷っている段階から相談可"]

    worries = "\n".join(f'        <div class="worry reveal">{ic("i-question")}{w}</div>' for w in lp["worries"])
    reasons = "\n".join(f'        <div class="reason reveal"><h3>{t}</h3><p>{d}</p></div>' for t, d in lp["reasons"])
    menu = "\n".join(
        f'        <article class="card reveal"><div class="icon">{ic(lp["icon"])}</div><h3>{t}</h3><p>{d}</p></article>'
        for t, d in lp["menu"]
    )
    flow = "\n".join(f'        <li class="step reveal"><h3>{t}</h3><p>{d}</p></li>' for t, d in lp["flow"])
    faq = "\n".join(f'        <details><summary>{q}</summary><div class="a">{a}</div></details>' for q, a in lp["faq"])

    voice = ""
    if lp.get("voice"):
        tag, text, name = VOICES[lp["voice"]]
        voice = f"""
  <section class="block tight" aria-labelledby="voice-title">
    <div class="wrap" style="max-width:820px">
      <div class="head center"><p class="en">Voice</p><h2 id="voice-title">お客様の声</h2><p>Googleの口コミでいただいた声をご紹介します。</p></div>
      <figure class="voice reveal">
        <div class="stars" aria-label="5点満点中5点">★★★★★</div>
        <span class="tag">{tag}</span>
        <blockquote>{text}</blockquote>
        <cite>{name}</cite>
      </figure>
    </div>
  </section>
"""

    listings = ""
    if lp.get("listings"):
        kind = lp["listings"]
        label = "売買物件" if kind == "sale" else "賃貸物件"
        listings = f"""
  <section class="block alt" aria-labelledby="list-title">
    <div class="wrap">
      <div class="head"><p class="en">Properties</p><h2 id="list-title">掲載中の{label}</h2><p>お客様からお預かりしている物件です。</p></div>
      <div class="listings" data-listings="{kind}"></div>
    </div>
  </section>
"""

    note = ""
    if reform and two_quotes:
        note = '<p class="note" style="margin-top:12px">※2社以上の見積もりは、草刈り・家具の新調・賃貸の管理業務を除きます。</p>'

    footer_extra = "" if reform else "宅地建物取引業 免許番号：熊本県知事（　）第　　号<!-- TODO: 免許番号を記入 --><br>"
    scripts = ""
    if lp.get("listings"):
        scripts = '<script src="../../assets/data/properties.js"></script>\n<script src="../../assets/js/listings.js"></script>\n'
    img_base = ' data-img-base="../../assets/img/properties/"' if lp.get("listings") else ""
    subject = re.sub(r"\s", "", lp["service"])

    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{lp["title"]}</title>
<meta name="description" content="{lp["lead"]}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Outfit:wght@600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/style.css">
</head>
<!-- このファイルは lp/_build.py で書き出しています。直接編集せず、_build.py を直して再実行してください。 -->
<body class="{theme} lp"{img_base}>
{icons}

<header class="header">
  <div class="wrap">
    <a href="{brand_home}" class="logo" aria-label="{re.sub('<[^>]+>', '', brand_name)}">
      <img class="logo-img" src="../../assets/img/logo.png" alt="">
      <span class="logo-name"><b>{brand_name}</b><span>{brand_desc}</span></span>
    </a>
    <a class="head-cta" href="{TEL_LINK}">{ic("i-phone")}<span>{TEL}</span></a>
  </div>
</header>

<main>
  <section class="hero">
    <div class="wrap">
      <div>
        <p class="lp-service"><b>{lp["service"]}</b>熊本・荒尾</p>
        <h1><span class="ln">{lp["h1"][0]}</span><br><span class="ln">{lp["h1"][1]}</span></h1>
        <p class="lead">{lp["lead"]}</p>
        <div class="cta-row">
          <a class="btn btn-main" href="{TEL_LINK}">{ic("i-phone")}電話で相談する</a>
          <a class="btn btn-line" href="{LINE}" target="_blank" rel="noopener">{ic("i-line")}LINEで相談</a>
        </div>
        <div class="chips">
{chr(10).join(f'          <span>{ic("i-check")}{c}</span>' for c in chips)}
        </div>
      </div>
      <!-- 仮の写真（Unsplash License）。実際の写真に差し替え -->
      <div class="lp-photo"><img src="../../assets/img/photos/{lp["photo"]}" alt="{lp["alt"]}（イメージ）"><span class="img-badge">イメージ</span></div>
    </div>
  </section>

  <section class="block alt near" aria-labelledby="worry-title">
    <div class="wrap">
      <div class="head"><p class="en">Your Worries</p><h2 id="worry-title">こんなお悩み、ありませんか？</h2></div>
      <div class="worries">
{worries}
      </div>
    </div>
  </section>

  <section class="block" aria-labelledby="reason-title">
    <div class="wrap">
      <div class="head"><p class="en">Why {"Livii" if reform else "Livii不動産"}</p><h2 id="reason-title">そのお悩み、{"Livii" if reform else "Livii不動産"}にお任せください</h2></div>
      <div class="reasons">
{reasons}
      </div>
      {note}
    </div>
  </section>

  <section class="block alt" aria-labelledby="menu-title">
    <div class="wrap">
      <div class="head"><p class="en">Services</p><h2 id="menu-title">{lp["service"]}の対応内容</h2></div>
      <div class="cards">
{menu}
      </div>
    </div>
  </section>
{listings}
  <section class="lp-mvv" aria-labelledby="mvv-title">
    <div class="wrap">
      <p class="en">Our Promise</p>
      <h2 id="mvv-title">私たちが大切にしていること</h2>
      <div class="rows">
        <div class="row"><b>Mission</b><small>果たすべき使命</small><p>{MISSION}</p></div>
        <div class="row"><b>Value</b><small>行動指針</small><p>{VALUE}</p></div>
      </div>
    </div>
  </section>

  <section class="block" aria-labelledby="flow-title">
    <div class="wrap">
      <div class="head"><p class="en">Flow</p><h2 id="flow-title">ご相談からの流れ</h2></div>
      <ol class="steps">
{flow}
      </ol>
    </div>
  </section>
{voice}
  <section class="block tight" aria-labelledby="person-title">
    <div class="wrap">
      <div class="person reveal">
        <img class="avatar" src="../../assets/img/hara.jpg" alt="代表 原 大和の似顔絵">
        <div>
          <p class="role">代表 ／ 宅地建物取引士</p>
          <h3 id="person-title">原 大和</h3>
          <p class="roman">HARA HIROKAZU</p>
          <dl>
            <dt>出身</dt><dd>1987年11月 熊本県荒尾市生まれ</dd>
            <dt>経歴</dt><dd>ホテル業、地場大手不動産会社、地場大手住宅会社の営業（新築注文住宅）など</dd>
          </dl>
        </div>
      </div>
    </div>
  </section>

  <section class="block tight" aria-labelledby="faq-title">
    <div class="wrap">
      <div class="head center"><p class="en">FAQ</p><h2 id="faq-title">よくあるご質問</h2></div>
      <div class="faq">
{faq}
      </div>
    </div>
  </section>

  <section id="contact" aria-labelledby="contact-title">
    <div class="wrap">
      <div class="contact reveal">
        <div class="contact-inner">
          <div>
            <p class="en">Contact</p>
            <h2 id="contact-title">{lp["cta"]}</h2>
            <p>ご相談は無料です。相談だけでもお気軽にどうぞ。</p>
            <a class="tel" href="{TEL_LINK}">{ic("i-phone")}{TEL}</a>
            <div class="hours">お電話でのご相談はこちら</div>
            <div class="cta-row">
              <a class="btn btn-line" href="{LINE}" target="_blank" rel="noopener">{ic("i-line")}LINEで相談</a>
              <a class="btn btn-white" href="mailto:{MAIL}?subject={subject}%E3%81%AE%E3%81%94%E7%9B%B8%E8%AB%87">{ic("i-mail")}メールで相談</a>
            </div>
          </div>
          <div class="qr"><img src="../../assets/img/line-qr.png" alt="LINEの友だち追加用QRコード"><span>LINEで相談</span></div>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="lp-footer">
  <div class="wrap">
    <div>
      <span class="logo"><img class="logo-img" src="../../assets/img/logo.png" alt=""><span class="logo-name"><b>{brand_name}</b><span>{brand_desc}</span></span></span>
      <address>{footer_extra}{ADDRESS}<br>TEL <a href="{TEL_LINK}">{TEL}</a>　Mail <a href="mailto:{MAIL}">{MAIL}</a></address>
    </div>
    <div class="links">
      <a href="{brand_home}">{"Livii（住まいの工事）" if reform else "Livii不動産"}のページへ</a>
      <a href="../../">Livii 総合トップ</a>
      <a href="https://www.instagram.com/livii_kumamoto/" target="_blank" rel="noopener">Instagram（@livii_kumamoto）</a>
    </div>
  </div>
  <div class="wrap" style="margin-top:20px;font-size:12px;color:#A9ACAE">© Livii</div>
</footer>

<div class="dock">
  <a class="btn btn-main" href="{TEL_LINK}">{ic("i-phone")}電話で相談</a>
  <a class="btn btn-line" href="{LINE}" target="_blank" rel="noopener">{ic("i-line")}LINEで相談</a>
</div>

{scripts}<script>
document.documentElement.classList.add('js');
const io=new IntersectionObserver(es=>es.forEach(e=>{{if(e.isIntersecting){{e.target.classList.add('in');io.unobserve(e.target)}}}}),{{threshold:.1}});
document.querySelectorAll('.reveal').forEach((el,i)=>{{el.style.transitionDelay=(i%3)*80+'ms';io.observe(el)}});
</script>
</body>
</html>
"""


def main():
    icons = sprite()
    for lp in LPS:
        out = HP / "lp" / lp["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(lp, icons))
        print("wrote", out.relative_to(HP))


if __name__ == "__main__":
    main()
