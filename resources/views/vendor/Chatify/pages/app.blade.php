@include('Chatify::layouts.headLinks')
<div class="messenger">
    <div class="messenger-listView {{ !!$id ? 'conversation-active' : '' }}">
        <div class="m-header">
            <nav>
                <a href="#"><i class="fas fa-inbox"></i> <span class="messenger-headTitle">MENSAGENS</span> </a>
                <nav class="m-header-right">
                    <a href="#"><i class="fas fa-cog settings-btn"></i></a>
                    <a href="#" class="listView-x"><i class="fas fa-times"></i></a>
                </nav>
            </nav>
            <input type="text" class="messenger-search" placeholder="Pesquisar..." />
        </div>
        <div class="m-body contacts-container">
           <div class="show messenger-tab users-tab app-scroll" data-view="users">
               <div class="favorites-section">
                <p class="messenger-title"><span>Favoritos</span></p>
                <div class="messenger-favorites app-scroll-hidden"></div>
               </div>
               {{-- Saved Messages --}}
               <p class="messenger-title"><span>Seus espaços</span></p>
               {!! view('Chatify::layouts.listItem', ['get' => 'saved']) !!}
               {{-- Contact --}}
               <p class="messenger-title"><span>Todas as mensagens</span></p>
               <div class="listOfContacts" style="width: 100%;height: calc(100% - 272px);position: relative;"></div>
           </div>
           <div class="messenger-tab search-tab app-scroll" data-view="search">
                <p class="messenger-title"><span>Pesquisar</span></p>
                <div class="search-records">
                    <p class="message-hint center-el"><span>Digite para pesquisar..</span></p>
                </div>
             </div>
        </div>
    </div>
    <div class="messenger-messagingView">
        <div class="m-header m-header-messaging">
            <nav class="chatify-d-flex chatify-justify-content-between chatify-align-items-center">
                <div class="chatify-d-flex chatify-justify-content-between chatify-align-items-center">
                    <a href="#" class="show-listView"><i class="fas fa-arrow-left"></i></a>
                    <div class="avatar av-s header-avatar" style="margin: 0px 10px; margin-top: -5px; margin-bottom: -5px;">
                    </div>
                    <a href="#" class="user-name">{{ config('chatify.name') }}</a>
                </div>
                <nav class="m-header-right">
                    <a href="#" class="add-to-favorite"><i class="fas fa-star"></i></a>
                    <a href="/"><i class="fas fa-home"></i></a>
                    <a href="#" class="show-infoSide"><i class="fas fa-info-circle"></i></a>
                </nav>
            </nav>
            <div class="internet-connection">
                <span class="ic-connected">Conectado</span>
                <span class="ic-connecting">Conectando...</span>
                <span class="ic-noInternet">Sem acesso à internet</span>
            </div>
        </div>
        <div class="m-body messages-container app-scroll">
            <div class="messages">
                <p class="message-hint center-el"><span>Por favor, selecione um chat para começar a enviar mensagens</span></p>
            </div>
            <div class="typing-indicator">
                <div class="message-card typing">
                    <div class="message">
                        <span class="typing-dots">
                            <span class="dot dot-1"></span>
                            <span class="dot dot-2"></span>
                            <span class="dot dot-3"></span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        @include('Chatify::layouts.sendForm')
    </div>
    <div class="messenger-infoView app-scroll">
        <nav>
            <p>Detalhes do Usuário</p>
            <a href="#"><i class="fas fa-times"></i></a>
        </nav>
        {!! view('Chatify::layouts.info')->render() !!}
    </div>
</div>

@include('Chatify::layouts.modals')
@include('Chatify::layouts.footerLinks')
