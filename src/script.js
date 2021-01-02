define(['jquery',
        'lib/components/base/modal',
        'intl-tel-input',
        'intl-tel-input-utils',
        'underscore'],
    function ($, Modal, intTel, intTelUtils, _) {
        var CustomWidget = function () {
            var self = this,
                ai_widget_code = 'widget_code',
                ai_widget_name = 'Название виджета',
                urlAPI = 'https://amoai.ru/ws/' + ai_widget_code,
                urlPanelAPI = 'https://amoai.ru/pm',
                error_msg = 'Произошла ошибка на стороне сервера! Обратитесь в службу технической поддержки виджета.'

            // Открытие модального окна
            this.openModal = function (data, class_name) {
                modal = new Modal({
                    class_name: 'modal-list ' + class_name,
                    init: function ($modal_body) {
                        var $this = $(this);
                        $modal_body
                            .trigger('modal:loaded')
                            .html(data)
                            .trigger('modal:centrify')
                            .append('<span class="modal-body__close"><span class="icon icon-modal-close"></span></span>');
                    },
                    destroy: function () {
                        ruleRewriteTasksQueue.shift();
                        if (ruleRewriteTasksQueue.length > 0) {
                            self.openConfirmRewriteModal(ruleRewriteTasksQueue[0]);
                        }
                    }
                });
            };

            // Показ уведомлений
            this.openAlert = function (text, type) {
                if (!type) type = 'success';

                if (type == 'success') {
                    return new Modal()._showSuccess(text, false, 3000);
                } else if (type == 'error') {
                    return new Modal()._showError(text, false);
                } else {
                    return false;
                }
            };

            this.openNotifications = function (text, type) {
                var params = {
                    header: ai_widget_name,
                    text: text
                };

                if (!type) type = 'success';

                if (type == 'success') {
                    AMOCRM.notifications.show_message(params);
                } else if (type == 'error') {
                    AMOCRM.notifications.show_message_error(params);
                } else {
                    return false;
                }
            };

            // Генерация шаблона
            this.getTemplate = function (template, callback) {
                template = template || '';

                return self.render({
                    href: '/templates/' + template + '.twig',
                    base_path: self.base_path,
                    load: callback
                });
            };

            // Добавление css
            this.appendCss = function (file) {
                if ($('link[href="' + self.base_path + file + '?v=' + self.params.version + '"]').length) {
                    return false;
                }

                $('head').append('<link type="text/css" rel="stylesheet" href="' + self.base_path + file + '?v=' + self.params.version + '">');

                return true;
            };

            // Получение id виджета
            this.id = function (postfix, hash) {
                hash = typeof hash !== 'undefined' ? hash : true;
                postfix = typeof postfix !== 'undefined' ? postfix : '';

                return (hash ? '#' : '') + self.params.widget_code + (postfix ? '_' + postfix : '');
            };

            // Кол-во активных пользователей
            this.activeUsers = function () {
                let users = 0;

                for (var manager in AMOCRM.constant('managers')) {
                    if (AMOCRM.constant('managers')[manager].active === true) {
                        users++;
                    }
                }

                return users;
            };

            // Установка виджета
            this.installWidget = function (btn) {
                return new Promise(function (succeed, fail) {
                    btn.trigger('button:load:start');

                    $.ajax({
                        url: urlPanelAPI + '/install',
                        type: 'post',
                        data: {
                            // Widget
                            widget_code: ai_widget_code,

                            // Account
                            account_id: AMOCRM.constant('account').id,
                            license_date: AMOCRM.constant('account').paid_till,
                            tariff: AMOCRM.constant('account').tariffName,
                            users: self.activeUsers(),

                            // User
                            client_id: AMOCRM.constant('user').id,
                            name: AMOCRM.constant('user').name,
                            email: AMOCRM.constant('user').login,
                            profile_phone: AMOCRM.constant('user').personal_mobile,
                            phone: $('.amoai-settings.' + self.params.widget_code).find('input[name=phone]').val()
                        },
                        dataType: 'json',
                        success: function (data) {
                            succeed(data);
                        },
                        error: function (jqxhr, status, errorMsg) {
                            fail(new Error("Request failed: " + errorMsg));
                        }
                    });
                });
            };

            // Получение статуса виджета
            this.getWidgetStatus = function () {
                return new Promise(function (succeed, fail) {
                    $.ajax({
                        url: urlPanelAPI + '/status',
                        type: 'post',
                        data: {
                            account_id: AMOCRM.constant('account').id,
                            widget_code: ai_widget_code
                        },
                        dataType: 'json',
                        success: function (data) {
                            succeed(data);
                        },
                        error: function (jqxhr, status, errorMsg) {
                            fail(new Error("Request failed: " + errorMsg));
                        }
                    });
                });
            };

            // Открыть форму "Купить"
            this.openOrderForm = function () {
                self.getTemplate('order_form', function (data) {
                    var params = {
                        btn_id: self.id('', false) + '_buy_widget_send',
                        btn_text: 'Оставить заявку',
                        name: AMOCRM.constant('user').name,
                        phone: AMOCRM.constant('user').personal_mobile,
                        email: AMOCRM.constant('user').login,
                        self: self
                    };

                    self.openModal(data.render(params), 'amoai-settings-order_form');
                });
            };

            // Отправка формы "Купить"
            this.sendOrderForm = function (btn) {
                var form = $('.amoai-settings-order_form form'),
                    error = false;

                form.find('.required').each(function () {
                    if ($(this).val() == '') {
                        $(this).addClass('error');

                        error = true;
                    } else {
                        $(this).removeClass('error');
                    }
                });

                if (error === false) {
                    btn.trigger('button:load:start');

                    $.ajax({
                        url: urlPanelAPI + '/order',
                        type: 'post',
                        data: {
                            // Widget
                            widget_code: ai_widget_code,

                            // Account
                            account_id: AMOCRM.constant('account').id,
                            license_date: AMOCRM.constant('account').paid_till,
                            tariff: AMOCRM.constant('account').tariffName,
                            users: self.activeUsers(),

                            // User
                            client_id: AMOCRM.constant('user').id,
                            name: form.find('input[name=name]').val(),
                            phone: form.find('input[name=phone]').val(),
                            email: form.find('input[name=email]').val(),
                            comment: form.find('textarea[name=comment]').val(),
                            profile_phone: AMOCRM.constant('user').personal_mobile
                        },
                        dataType: 'json',
                        success: function (res) {
                            let type = res.error ? 'error' : 'success';
                            self.openAlert(res.msg, type);
                            btn.closest('.modal').remove();
                        },
                        error: function () {
                            self.openAlert(error_msg, 'error');
                            btn.trigger('button:load:stop');
                        }
                    });
                } else {
                    self.openAlert('Заполните обязательные поля!', 'error');
                }
            };

            // забиндить событие на клик по ID элемента до появления этого элемента в DOM дереве
            this.bindClickAction = function (buttonId, callback) {
                $('body').off('click', buttonId);
                $('body').on('click', buttonId, function (e) {
                    e.preventDefault();

                    callback();
                });
            };

            // Получение настроек виджета
            this.getWidgetSettings = function () {
                return new Promise(function (succeed, fail) {
                    $.ajax({
                        url: 'https://amoai.ru/pm/market-place/widget/' + ai_widget_code + '/settings',
                        type: 'get',
                        dataType: 'json',
                        success: function (data) {
                            succeed(data);
                        },
                        error: function (jqxhr, status, errorMsg) {
                            fail(new Error("Request failed: " + errorMsg));
                        }
                    });
                });
            };

            // загрузка данных
            this.loadData = function (callback) {
                let promises = []

                Promise.all(promises)
                    .then(function (result) {

                        // write loaded data to our variables

                        if(typeof callback === "function")
                            callback()
                    });
            };

            this.callbacks = {
                render: function () {
                    self.base_path = urlAPI + '/widget/installer';

                    if ($(`#widget-page_${self.params.widget_code}`).length) {
                        $(`#widget-page_${self.params.widget_code} .filter__list__item_description`).text('CompanyName');
                    }

                    return true;
                },
                init: function () {
                    self.loadData(() => {
                        // some code after data loading
                    });

                    return true;
                },
                bind_actions: function () {
                    self.bindClickAction(self.id() + '_buy_widget_btn', function () {
                        self.openOrderForm();
                    });
                    self.bindClickAction(self.id() + '_buy_widget_send', function () {
                        self.sendOrderForm($(this));
                    });

                    // View "Settings" tab
                    $('body').off('change', self.id() + ' .view-integration-modal__tabs input[name="type_integration_modal"]');
                    $('body').on('change', self.id() + ' .view-integration-modal__tabs input[name="type_integration_modal"]', function () {
                        let id = $(self.id() + ' .view-integration-modal__tabs input[name="type_integration_modal"]:checked').attr('id');

                        if (id == 'setting') {
                            $(self.id() + ' .view-integration-modal__keys').addClass('hidden');
                            $(self.id() + ' .view-integration-modal__access').addClass('hidden');
                            $(self.id() + ' .widget-settings__desc-space').addClass('hidden');

                            $(self.id() + ' .view-integration-modal__setting').removeClass('hidden');
                        } else {
                            $(self.id() + ' .view-integration-modal__setting').addClass('hidden');
                        }
                    });

                    return true;
                },
                settings: function () {
                    const $modal = $('.widget-settings__modal.' + self.params.widget_code);
                    const $save = $modal.find('button.js-widget-save');

                    $modal.attr('id', self.id('', false)).addClass('amoai-settings');

                    self.getWidgetSettings().then(function (data) {

                        // Add style
                        self.appendCss('/css/style.css');

                        // Add description
                        $modal.find('.widget_settings_block__descr').html(data.data.description);

                        // Add footer
                        $modal.find('.widget-settings__wrap-desc-space').append(data.data.footer);

                        // Add confirm
                        $modal.find('.widget_settings_block__fields').append(data.data.confirm);

                        // Статус виджета
                        self.getWidgetStatus().then(function (res) {

                            // Add status text
                            $modal.find('.amoai_settings_payment_info_text').text(res.data.msg).css("color", res.data.active ? "#749e42" : "#ff7779");

                            if (self.get_install_status() != 'installed') {
                                if (res.error) {

                                    // Add warning
                                    $modal.find('.widget_settings_block__descr').prepend(data.data.warning);

                                    // Activate btn
                                    $save.find('.button-input-inner__text').text('Активировать виджет');
                                    $save.trigger('button:enable').addClass('amoai-settings-activate_btn');

                                    // Автозаполнение телефона
                                    let is_admin = AMOCRM.constant('managers')[AMOCRM.constant('user').id].is_admin;

                                    if (is_admin == 'Y') {
                                        if ($modal.find('input[name="phone"]').val() == '' && AMOCRM.constant('user').personal_mobile != '') {
                                            $modal.find('input[name="phone"]').val(AMOCRM.constant('user').personal_mobile);
                                        }
                                    }

                                    // Add mask
                                    $modal.find('input[name="phone"]').intlTelInput({
                                        initialCountry: 'ru',
                                        onlyCountries: ['ru', 'by', 'kz', 'ua']
                                    });

                                    // Активировать виджет
                                    let save_flag = false;
                                    $save.off('click').on('click', function () {

                                        if (save_flag) {
                                            save_flag = false;

                                            return true;
                                        }

                                        // Если не заполнено поле "Телефон"
                                        if ($modal.find('input[name="phone"]').val() == '') {
                                            self.openAlert('Заполните номер телефона!', 'error');

                                            return false;
                                        }

                                        // Если не дали согласие на передачу данных
                                        if ($modal.find('#amoai_settings_confirm').prop('checked') === false) {
                                            self.openAlert('Вам необходимо дать согласие на передачу данных из amoCRM.', 'error');

                                            return false;
                                        }

                                        // Активация виджета
                                        self.installWidget($save).then(function (res) {
                                            let type = res.error ? 'error' : 'success';
                                            self.openAlert(res.msg, type);

                                            if (type == 'success') {
                                                save_flag = true;
                                                $save.trigger('click');
                                            }
                                        }, function (error) {
                                            self.openAlert(error_msg, 'error');
                                        });

                                        return false;
                                    });
                                } else {
                                    // Deactive btn & hide warning
                                    $modal.find('.widget_settings_block__fields').hide();

                                    // Activate widget in amo
                                    if (self.get_install_status() == 'not_configured') {
                                        $save.trigger('click');
                                    }
                                    // Логика настроек виджета
                                }
                            } else {
                                // Deactive btn & hide warning
                                $modal.find('.widget_settings_block__fields').hide();
                            }
                        }, function (error) {
                            self.openAlert(error_msg, 'error');
                        });
                    }, function (error) {
                        self.openAlert(error_msg, 'error');
                    });

                    return true;
                },
                onSave: function () {
                    return true;
                },
                destroy: function () {
                }
            };

            return this;

        };

        return CustomWidget;
    });
